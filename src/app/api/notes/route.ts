import { validNasaId } from "@/lib/auth/validation";
import { databaseError, privateJson, requireApiUser } from "@/lib/server/api-auth";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return privateJson({ error: { code: "invalid_request", message: "The note was not valid JSON." } }, 400); }
  if (typeof body !== "object" || body === null || !("nasaId" in body) || !validNasaId(body.nasaId) || !("content" in body) || typeof body.content !== "string") {
    return privateJson({ error: { code: "invalid_request", message: "A NASA citation ID and note text are required." } }, 400);
  }
  const content = body.content.trim();
  if (content.length < 1 || content.length > 20_000) return privateJson({ error: { code: "invalid_request", message: "Notes must be between 1 and 20,000 characters." } }, 400);
  const { data: paper, error: paperError } = await auth.client.from("saved_papers")
    .select("id").eq("user_id", auth.user.id).eq("nasa_id", body.nasaId).maybeSingle();
  if (paperError) return databaseError(paperError);
  if (!paper) return privateJson({ error: { code: "paper_not_saved", message: "Save this paper to your library before adding a personal note." } }, 409);
  const { error } = await auth.client.from("personal_notes").upsert({
    user_id: auth.user.id,
    saved_paper_id: paper.id,
    content,
  }, { onConflict: "user_id,saved_paper_id" });
  if (error) return databaseError(error);
  return privateJson({ saved: true });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const nasaId = new URL(request.url).searchParams.get("nasaId");
  if (!validNasaId(nasaId)) return privateJson({ error: { code: "invalid_request", message: "A valid NASA citation ID is required." } }, 400);
  const { data: paper, error: paperError } = await auth.client.from("saved_papers")
    .select("id").eq("user_id", auth.user.id).eq("nasa_id", nasaId).maybeSingle();
  if (paperError) return databaseError(paperError);
  if (paper) {
    const { error } = await auth.client.from("personal_notes").delete().eq("user_id", auth.user.id).eq("saved_paper_id", paper.id);
    if (error) return databaseError(error);
  }
  return privateJson({ deleted: true });
}
