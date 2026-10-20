import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AssistantServiceError, normalizeAssistantRequest, readBoundedJsonBody, runGroundedResearchAssistant } from "@/lib/ai-research-assistant-core";
import { GeminiProviderError, generateGroundedAnswer, getGeminiServerConfig, type GeminiServerConfig } from "@/lib/server/gemini-provider";
import { requireApiUser, privateJson } from "@/lib/server/api-auth";
import { NtrsProviderError, getNtrsCitation, searchNtrs } from "@/lib/server/ntrs-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The grounded workflow may use the full bounded Gemini request deadline.
export const maxDuration = 60;

type PublicError = { code: string; message: string; status: number };

function publicError(error: unknown): PublicError {
  if (error instanceof AssistantServiceError) {
    switch (error.code) {
      case "invalid_json": return { code: error.code, message: error.message, status: 400 };
      case "invalid_request": return { code: error.code, message: error.message, status: 400 };
      case "request_too_large": return { code: error.code, message: error.message, status: 413 };
      case "not_configured": return { code: error.code, message: error.message, status: 503 };
      case "invalid_model": return { code: error.code, message: error.message, status: 503 };
      case "invalid_citation": return { code: error.code, message: error.message, status: 502 };
      case "invalid_model_response": return { code: error.code, message: error.message, status: 502 };
    }
  }
  if (error instanceof GeminiProviderError) {
    if (error.kind === "not_configured") return { code: error.kind, message: error.message, status: 503 };
    if (error.kind === "invalid_model") return { code: error.kind, message: error.message, status: 503 };
    if (error.kind === "timeout") return { code: error.kind, message: error.message, status: 504 };
    if (error.kind === "quota") return { code: error.kind, message: error.message, status: 429 };
    return { code: error.kind, message: error.message, status: 502 };
  }
  if (error instanceof NtrsProviderError) {
    if (error.kind === "timeout") return { code: "ntrs_timeout", message: "NASA NTRS is taking too long to respond. Please try again.", status: 504 };
    return { code: "ntrs_unavailable", message: "NASA NTRS could not retrieve the source records for this question. Gemini was not asked to answer without them.", status: 502 };
  }
  return { code: "assistant_unavailable", message: "The research assistant could not complete this request. Please try again.", status: 502 };
}

function errorJson(error: unknown) {
  const mapped = publicError(error);
  return NextResponse.json({ error: { code: mapped.code, message: mapped.message } }, {
    status: mapped.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function logAssistantStage(input: Record<string, unknown>): void {
  console.info(JSON.stringify({ event: "assistant_stage", ...input }));
}

function eventStream(
  rawInput: unknown,
  config: GeminiServerConfig | null,
  configFailure: { code: string; message: string } | null,
  signal: AbortSignal,
  requestId: string,
  requestStartedAt: number,
  requestByteCount: number,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const logDisconnect = () => logAssistantStage({ requestId, stage: "client_disconnect", outcome: "aborted", elapsedTimeMs: Date.now() - requestStartedAt });
      signal.addEventListener("abort", logDisconnect, { once: true });
      const send = (event: unknown) => {
        if (closed || signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      try {
        const result = await runGroundedResearchAssistant(rawInput, {
          search: searchNtrs,
          getCitation: getNtrsCitation,
          generate: config ? (input, generationSignal) => generateGroundedAnswer(input, config, generationSignal, requestId) : null,
          synthesisUnavailable: configFailure ?? undefined,
          synthesisFailure: (error) => {
            const mapped = publicError(error);
            return {
              code: mapped.code,
              message: `${mapped.message} Retrieved NASA records are shown below; no AI conclusion is available.`,
            };
          },
        }, {
          signal,
          onDiagnostic: (diagnostic) => logAssistantStage({ requestId, ...diagnostic }),
          onRetrievalStart: (queries) => send({ type: "status", stage: "retrieval", queries }),
          onSynthesisStart: () => send({ type: "status", stage: "synthesis" }),
        });
        logAssistantStage({
          requestId,
          stage: "final_response_delivery",
          outcome: "queued",
          elapsedTimeMs: Date.now() - requestStartedAt,
          requestByteCount,
          sourceCount: result.sources.length,
          resultStatus: result.status,
        });
        send({ type: "result", data: result });
      } catch (error) {
        const mapped = publicError(error);
        logAssistantStage({
          requestId,
          stage: "final_response_delivery",
          outcome: signal.aborted ? "client_aborted" : "error_queued",
          elapsedTimeMs: Date.now() - requestStartedAt,
          requestByteCount,
          errorCode: mapped.code,
          httpStatus: error instanceof GeminiProviderError ? error.upstreamStatus ?? null : mapped.status,
          timeoutOrigin: error instanceof GeminiProviderError ? error.timeoutOrigin ?? null : null,
        });
        send({ type: "error", error: publicError(error) });
      } finally {
        signal.removeEventListener("abort", logDisconnect);
        if (!closed) {
          closed = true;
          try { controller.close(); } catch { /* The client may have disconnected. */ }
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const requestStartedAt = Date.now();
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return privateJson({ error: { code: "invalid_content_type", message: "Send this research question as JSON." } }, 415);
  }

  let payload: unknown;
  try {
    payload = await readBoundedJsonBody(request);
    normalizeAssistantRequest(payload);
  } catch (error) {
    return errorJson(error);
  }
  const requestByteCount = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  logAssistantStage({ requestId, stage: "request_accepted", outcome: "accepted", elapsedTimeMs: Date.now() - requestStartedAt, requestByteCount });

  let config: GeminiServerConfig | null = null;
  let configFailure: { code: string; message: string } | null = null;
  try {
    config = getGeminiServerConfig();
  } catch (error) {
    const mapped = publicError(error);
    const reason = mapped.code === "not_configured"
      ? "Gemini server configuration is missing."
      : mapped.code === "invalid_model"
        ? "Gemini server model configuration is invalid."
        : "The Gemini service is unavailable.";
    configFailure = {
      code: mapped.code,
      message: `NASA source retrieval can continue with a deterministic query plan, but ${reason} No AI conclusion will be generated.`,
    };
  }

  const response = eventStream(payload, config, configFailure, request.signal, requestId, requestStartedAt, requestByteCount);
  response.headers.set("X-Request-ID", requestId);
  return response;
}
