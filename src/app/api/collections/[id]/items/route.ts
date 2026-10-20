import { validNasaId } from "@/lib/auth/validation";
import { databaseError, privateJson, requireApiUser } from "@/lib/server/api-auth";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requestedPaperId(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && "nasaId" in body && validNasaId(body.nasaId) ? body.nasaId : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: collectionId } = await params;
  if (!UUID.test(collectionId)) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  const nasaId = await requestedPaperId(request);
  if (!nasaId) return privateJson({ error: { code: "invalid_request", message: "A valid saved NASA citation ID is required." } }, 400);

  const { data: collection, error: collectionError } = await auth.client.from("research_collections")
    .select("id").eq("user_id", auth.user.id).eq("id", collectionId).maybeSingle();
  if (collectionError) return databaseError(collectionError);
  if (!collection) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  const { data: paper, error: paperError } = await auth.client.from("saved_papers")
    .select("id").eq("user_id", auth.user.id).eq("nasa_id", nasaId).maybeSingle();
  if (paperError) return databaseError(paperError);
  if (!paper) return privateJson({ error: { code: "paper_not_saved", message: "Save this NASA paper to your Paper Library before adding it to a collection." } }, 409);

  const { error } = await auth.client.from("collection_items").upsert({
    user_id: auth.user.id,
    collection_id: collectionId,
    saved_paper_id: paper.id,
  }, { onConflict: "collection_id,saved_paper_id", ignoreDuplicates: true });
  if (error) return databaseError(error);
  return privateJson({ added: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: collectionId } = await params;
  if (!UUID.test(collectionId)) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  const nasaId = await requestedPaperId(request);
  if (!nasaId) return privateJson({ error: { code: "invalid_request", message: "A valid NASA citation ID is required." } }, 400);
  const { data: paper, error: paperError } = await auth.client.from("saved_papers")
    .select("id").eq("user_id", auth.user.id).eq("nasa_id", nasaId).maybeSingle();
  if (paperError) return databaseError(paperError);
  if (!paper) return privateJson({ removed: true });
  const { error } = await auth.client.from("collection_items").delete().eq("user_id", auth.user.id)
    .eq("collection_id", collectionId).eq("saved_paper_id", paper.id);
  if (error) return databaseError(error);
  return privateJson({ removed: true });
}
