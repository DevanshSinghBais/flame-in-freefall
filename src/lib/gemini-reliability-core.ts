export type GeminiOperation = "planning" | "synthesis";

export const DEFAULT_GEMINI_SYNTHESIS_MODEL = "gemini-3.6-flash";
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_GEMINI_MODEL = DEFAULT_GEMINI_SYNTHESIS_MODEL;

export type GeminiModelConfiguration = {
  primaryModel: string;
  fallbackModel: string | null;
  planningModel: string;
};

const MODEL_NAME = /^gemini-[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

export function resolveGeminiModelConfiguration(environment: Record<string, string | undefined>): GeminiModelConfiguration {
  const primaryModel = environment.GEMINI_SYNTHESIS_MODEL?.trim()
    || environment.GEMINI_MODEL?.trim()
    || DEFAULT_GEMINI_SYNTHESIS_MODEL;
  const fallbackValue = environment.GEMINI_FALLBACK_MODEL;
  const fallbackModel = fallbackValue === undefined ? DEFAULT_GEMINI_FALLBACK_MODEL : (fallbackValue.trim() || null);
  const planningModel = environment.GEMINI_PLANNING_MODEL?.trim() || fallbackModel || DEFAULT_GEMINI_FALLBACK_MODEL;

  if (![primaryModel, ...(fallbackModel ? [fallbackModel] : []), planningModel].every((model) => MODEL_NAME.test(model))) {
    throw new Error("The configured Gemini model identifier is invalid.");
  }

  return { primaryModel, fallbackModel, planningModel };
}

export function hasGeminiApiKey(environment: Record<string, string | undefined>): boolean {
  return !!environment.GEMINI_API_KEY?.trim();
}

export type GeminiFailureCategory =
  | "availability"
  | "rate_limit"
  | "timeout"
  | "network"
  | "authentication"
  | "invalid_model"
  | "invalid_request"
  | "malformed_response"
  | "provider_error"
  | "cancelled";

export type GeminiAttemptDiagnostic = {
  operation: GeminiOperation;
  modelIdentifier: string;
  httpStatus: number | null;
  providerErrorCategory: GeminiFailureCategory | null;
  attemptNumber: number;
  elapsedTimeMs: number;
  applicationAttemptTimeoutMs: number;
  fallbackAttempted: boolean;
  timeoutOrigin?: "upstream_http" | "sdk_timeout" | "application_attempt_timeout" | "application_deadline" | "caller_abort";
};

export type GeminiModelAttempt = { model: string; attempts: number };

export type GeminiReliabilityPolicy = {
  attemptTimeoutMs: number;
  requestDeadlineMs: number;
  initialRetryDelayMs: number;
  maxRetryDelayMs: number;
};

export type GeminiRequestContext = {
  signal: AbortSignal;
  timeoutMs: number;
  attemptNumber: number;
};

export type GeminiReliableRequestOptions<T> = {
  operation: GeminiOperation;
  models: GeminiModelAttempt[];
  policy: GeminiReliabilityPolicy;
  signal?: AbortSignal;
  request: (model: string, context: GeminiRequestContext) => Promise<T>;
  onAttempt?: (diagnostic: GeminiAttemptDiagnostic) => void;
  random?: () => number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
};

export class GeminiReliabilityError extends Error {
  readonly category: GeminiFailureCategory;
  readonly httpStatus: number | null;
  readonly timeoutOrigin?: GeminiAttemptDiagnostic["timeoutOrigin"];

  constructor(category: GeminiFailureCategory, httpStatus: number | null = null, timeoutOrigin?: GeminiAttemptDiagnostic["timeoutOrigin"]) {
    super("Gemini request did not complete.");
    this.name = "GeminiReliabilityError";
    this.category = category;
    this.httpStatus = httpStatus;
    this.timeoutOrigin = timeoutOrigin;
  }
}

type ClassifiedFailure = {
  category: GeminiFailureCategory;
  httpStatus: number | null;
  retryable: boolean;
  timeoutOrigin?: GeminiAttemptDiagnostic["timeoutOrigin"];
};

function readStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}

function classifyFailure(error: unknown, attemptTimedOut: boolean): ClassifiedFailure {
  const httpStatus = readStatus(error);
  if (httpStatus === 429) return { category: "rate_limit", httpStatus, retryable: true };
  if (httpStatus === 408 || httpStatus === 504) return { category: "timeout", httpStatus, retryable: true, timeoutOrigin: "upstream_http" };
  if (httpStatus === 500 || httpStatus === 502 || httpStatus === 503) {
    return { category: "availability", httpStatus, retryable: true };
  }
  if (httpStatus === 401 || httpStatus === 403) return { category: "authentication", httpStatus, retryable: false };
  if (httpStatus === 404) return { category: "invalid_model", httpStatus, retryable: false };
  if (httpStatus !== null && httpStatus >= 400 && httpStatus < 500) {
    return { category: "invalid_request", httpStatus, retryable: false };
  }
  if (httpStatus !== null) return { category: "provider_error", httpStatus, retryable: false };

  const customCategory = typeof error === "object" && error !== null && "providerErrorCategory" in error
    ? (error as { providerErrorCategory?: unknown }).providerErrorCategory
    : undefined;
  if (customCategory === "malformed_response") return { category: "malformed_response", httpStatus: null, retryable: false };
  if (attemptTimedOut) return { category: "timeout", httpStatus: null, retryable: true, timeoutOrigin: "application_attempt_timeout" };
  if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
    return { category: "timeout", httpStatus: null, retryable: true, timeoutOrigin: "sdk_timeout" };
  }
  if (error instanceof TypeError) return { category: "network", httpStatus: null, retryable: true };
  return { category: "provider_error", httpStatus: null, retryable: false };
}

function abortError(message: string): Error {
  return new DOMException(message, "AbortError");
}

function combineSignals(signals: AbortSignal[]): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const listeners: Array<{ signal: AbortSignal; listener: () => void }> = [];

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    const listener = () => controller.abort(signal.reason);
    listeners.push({ signal, listener });
    signal.addEventListener("abort", listener, { once: true });
  }

  return {
    signal: controller.signal,
    dispose: () => listeners.forEach(({ signal, listener }) => signal.removeEventListener("abort", listener)),
  };
}

function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? abortError("The Gemini request was aborted."));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? abortError("The Gemini request was aborted."));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function defaultSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  if (signal.aborted) return Promise.reject(signal.reason ?? abortError("The Gemini request was aborted."));
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason ?? abortError("The Gemini request was aborted."));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Runs explicit per-model retry limits under one hard deadline. The SDK retry layer must be set to one attempt. */
export async function runGeminiWithReliability<T>(options: GeminiReliableRequestOptions<T>): Promise<T> {
  const validModels = options.models.filter(({ model, attempts }) => model.trim().length > 0 && Number.isInteger(attempts) && attempts > 0);
  if (validModels.length === 0) throw new GeminiReliabilityError("invalid_model");

  const start = Date.now();
  const deadlineController = new AbortController();
  let deadlineExpired = false;
  let callerCancelled = false;
  let fallbackAttempted = false;
  let totalAttemptNumber = 0;
  const diagnostics: Array<Omit<GeminiAttemptDiagnostic, "fallbackAttempted">> = [];
  const deadlineTimer = setTimeout(() => {
    deadlineExpired = true;
    deadlineController.abort(abortError("The Gemini request deadline was reached."));
  }, options.policy.requestDeadlineMs);
  const callerAbortListener = () => {
    callerCancelled = true;
    deadlineController.abort(options.signal?.reason ?? abortError("The Gemini request was cancelled."));
  };
  if (options.signal?.aborted) callerAbortListener();
  else options.signal?.addEventListener("abort", callerAbortListener, { once: true });

  const finishDiagnostics = () => {
    const fallbackWasAttempted = fallbackAttempted;
    for (const diagnostic of diagnostics) {
      try {
        options.onAttempt?.({ ...diagnostic, fallbackAttempted: fallbackWasAttempted });
      } catch {
        // Diagnostics must never change the research result.
      }
    }
  };

  try {
    for (let modelIndex = 0; modelIndex < validModels.length; modelIndex += 1) {
      const modelAttempt = validModels[modelIndex];
      if (!modelAttempt) continue;
      if (modelIndex > 0) fallbackAttempted = true;
      let lastFailure: ClassifiedFailure | null = null;

      for (let modelAttemptNumber = 1; modelAttemptNumber <= modelAttempt.attempts; modelAttemptNumber += 1) {
        if (callerCancelled) throw new GeminiReliabilityError("cancelled", null, "caller_abort");
        if (deadlineExpired || Date.now() - start >= options.policy.requestDeadlineMs) {
          deadlineExpired = true;
          throw new GeminiReliabilityError("timeout", null, "application_deadline");
        }

        const attemptStart = Date.now();
        const remainingMs = Math.max(1, options.policy.requestDeadlineMs - (attemptStart - start));
        const timeoutMs = Math.max(1, Math.min(options.policy.attemptTimeoutMs, remainingMs));
        const attemptController = new AbortController();
        let attemptTimedOut = false;
        const attemptTimer = setTimeout(() => {
          attemptTimedOut = true;
          attemptController.abort(abortError("The Gemini attempt timed out."));
        }, timeoutMs);
        const combined = combineSignals([deadlineController.signal, attemptController.signal]);
        totalAttemptNumber += 1;

        try {
          const request = Promise.resolve().then(() => options.request(modelAttempt.model, {
            signal: combined.signal,
            timeoutMs,
            attemptNumber: totalAttemptNumber,
          }));
          const result = await raceWithAbort(request, combined.signal);
          diagnostics.push({
            operation: options.operation,
            modelIdentifier: modelAttempt.model,
            httpStatus: null,
            providerErrorCategory: null,
            attemptNumber: totalAttemptNumber,
            elapsedTimeMs: Date.now() - attemptStart,
            applicationAttemptTimeoutMs: timeoutMs,
          });
          return result;
        } catch (error) {
          if (callerCancelled) {
            diagnostics.push({
              operation: options.operation,
              modelIdentifier: modelAttempt.model,
              httpStatus: null,
              providerErrorCategory: "cancelled",
              attemptNumber: totalAttemptNumber,
              elapsedTimeMs: Date.now() - attemptStart,
              applicationAttemptTimeoutMs: timeoutMs,
              timeoutOrigin: "caller_abort",
            });
            throw new GeminiReliabilityError("cancelled", null, "caller_abort");
          }
          if (deadlineExpired || Date.now() - start >= options.policy.requestDeadlineMs) {
            deadlineExpired = true;
            diagnostics.push({
              operation: options.operation,
              modelIdentifier: modelAttempt.model,
              httpStatus: null,
              providerErrorCategory: "timeout",
              attemptNumber: totalAttemptNumber,
              elapsedTimeMs: Date.now() - attemptStart,
              applicationAttemptTimeoutMs: timeoutMs,
              timeoutOrigin: "application_deadline",
            });
            throw new GeminiReliabilityError("timeout", null, "application_deadline");
          }

          const failure = classifyFailure(error, attemptTimedOut);
          lastFailure = failure;
          diagnostics.push({
            operation: options.operation,
            modelIdentifier: modelAttempt.model,
            httpStatus: failure.httpStatus,
            providerErrorCategory: failure.category,
            attemptNumber: totalAttemptNumber,
            elapsedTimeMs: Date.now() - attemptStart,
            applicationAttemptTimeoutMs: timeoutMs,
            ...(failure.timeoutOrigin ? { timeoutOrigin: failure.timeoutOrigin } : {}),
          });

          if (!failure.retryable) throw new GeminiReliabilityError(failure.category, failure.httpStatus, failure.timeoutOrigin);
          if (modelAttemptNumber < modelAttempt.attempts) {
            clearTimeout(attemptTimer);
            const exponentialDelay = Math.min(
              options.policy.maxRetryDelayMs,
              options.policy.initialRetryDelayMs * (2 ** (modelAttemptNumber - 1)),
            );
            const randomValue = Math.max(0, Math.min(1, (options.random ?? Math.random)()));
            const jitteredDelay = Math.floor(exponentialDelay * randomValue);
            if (Date.now() - start + jitteredDelay >= options.policy.requestDeadlineMs) {
              throw new GeminiReliabilityError("timeout", failure.httpStatus, "application_deadline");
            }
            await (options.sleep ?? defaultSleep)(jitteredDelay, deadlineController.signal);
            continue;
          }

          if (modelIndex + 1 < validModels.length) break;
          throw new GeminiReliabilityError(failure.category, failure.httpStatus, failure.timeoutOrigin);
        } finally {
          clearTimeout(attemptTimer);
          combined.dispose();
        }
      }

      if (!lastFailure?.retryable || modelIndex + 1 >= validModels.length) {
        throw new GeminiReliabilityError(lastFailure?.category ?? "provider_error", lastFailure?.httpStatus ?? null, lastFailure?.timeoutOrigin);
      }
    }

    throw new GeminiReliabilityError("provider_error");
  } catch (error) {
    if (callerCancelled) throw new GeminiReliabilityError("cancelled", null, "caller_abort");
    if (deadlineExpired) throw new GeminiReliabilityError("timeout", null, "application_deadline");
    if (error instanceof GeminiReliabilityError) throw error;
    const failure = classifyFailure(error, false);
    throw new GeminiReliabilityError(failure.category, failure.httpStatus, failure.timeoutOrigin);
  } finally {
    clearTimeout(deadlineTimer);
    options.signal?.removeEventListener("abort", callerAbortListener);
    finishDiagnostics();
  }
}
