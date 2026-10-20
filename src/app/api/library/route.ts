import { getNtrsCitation, NtrsProviderError } from "@/lib/server/ntrs-provider";
import { validNasaId } from "@/lib/auth/validation";
import { databaseError, privateJson, requireApiUser } from "@/lib/server/api-auth";

const ID_LIST_LIMIT = 100;

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const rawIds = new URL(request.url).searchParams.get("ids");
  if (!rawIds) return privateJson({ error: { code: "invalid_request", message: "Provide NASA citation IDs to check saved status." } }, 400);
  const ids = [...new Set(rawIds.split(","))];
  if (ids.length > ID_LIST_LIMIT || ids.some((id) => !validNasaId(id))) {
    return privateJson({ error: { code: "invalid_request", message: "The requested citation ID list is invalid." } }, 400);
  }
  const { data, error } = await auth.client.from("saved_papers").select("nasa_id").in("nasa_id", ids);
  if (error) return databaseError(error);
  return privateJson({ savedIds: (data ?? []).map((record) => record.nasa_id) });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return privateJson({ error: { code: "invalid_request", message: "The save request was not valid JSON." } }, 400); }
  const nasaId = typeof body === "object" && body !== null && "nasaId" in body ? body.nasaId : null;
  if (!validNasaId(nasaId)) return privateJson({ error: { code: "invalid_request", message: "A valid NASA citation ID is required." } }, 400);

  let record;
  try {
    // Ignore browser-supplied titles and metadata: persist only a live source
    // record retrieved by its stable NASA identifier.
    record = await getNtrsCitation(nasaId);
  } catch (error) {
    if (error instanceof NtrsProviderError && error.kind === "not-found") {
      return privateJson({ error: { code: "source_not_found", message: "NASA NTRS did not return this citation." } }, 404);
    }
    const timeout = error instanceof NtrsProviderError && error.kind === "timeout";
    return privateJson({ error: { code: timeout ? "source_timeout" : "source_unavailable", message: timeout ? "NASA NTRS took too long to respond. Try again." : "NASA NTRS is temporarily unavailable. Try again." } }, timeout ? 504 : 502);
  }

  const { error } = await auth.client.from("saved_papers").insert({
    user_id: auth.user.id,
    nasa_id: record.id,
    canonical_url: record.canonicalUrl,
    title: record.title,
    abstract: record.abstract ?? null,
    authors: record.authors,
    publication_date: record.publicationDate ?? null,
    doi: record.doi ?? null,
    document_type: record.documentType ?? null,
    center: record.center ?? null,
    subject_categories: record.subjectCategories,
    source_retrieved_at: new Date().toISOString(),
  });
  if (error?.code === "23505") return privateJson({ saved: true, alreadySaved: true });
  if (error) return databaseError(error);
  return privateJson({ saved: true, alreadySaved: false }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const nasaId = new URL(request.url).searchParams.get("nasaId");
  if (!validNasaId(nasaId)) return privateJson({ error: { code: "invalid_request", message: "A valid NASA citation ID is required." } }, 400);
  const { error } = await auth.client.from("saved_papers").delete().eq("user_id", auth.user.id).eq("nasa_id", nasaId);
  if (error) return databaseError(error);
  return privateJson({ saved: false });
}
