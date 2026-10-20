import { databaseError, privateJson, requireApiUser } from "@/lib/server/api-auth";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  const { data: collection, error } = await auth.client.from("research_collections")
    .select("id,name,description,created_at,updated_at").eq("id", id).maybeSingle();
  if (error) return databaseError(error);
  if (!collection) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  const { data: itemRows, error: itemError } = await auth.client.from("collection_items")
    .select("saved_paper_id,created_at").eq("collection_id", id).order("created_at", { ascending: false });
  if (itemError) return databaseError(itemError);
  const { data: library, error: libraryError } = await auth.client.from("saved_papers")
    .select("id,nasa_id,canonical_url,title,abstract,authors,publication_date,doi,document_type,center,subject_categories,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (libraryError) return databaseError(libraryError);
  const papersById = new Map((library ?? []).map((paper) => [paper.id, paper]));
  const itemIds = new Set((itemRows ?? []).map((item) => item.saved_paper_id));
  const items = (itemRows ?? []).flatMap((item) => {
    const paper = papersById.get(item.saved_paper_id);
    return paper ? [{ ...paper, addedAt: item.created_at }] : [];
  });
  const availablePapers = (library ?? []).filter((paper) => !itemIds.has(paper.id));
  return privateJson({ collection, items, availablePapers });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  let body: unknown;
  try { body = await request.json(); } catch { return privateJson({ error: { code: "invalid_request", message: "The collection request was not valid JSON." } }, 400); }
  if (typeof body !== "object" || body === null) return privateJson({ error: { code: "invalid_request", message: "Collection details are required." } }, 400);
  const changes: { name?: string; description?: string | null } = {};
  if ("name" in body && typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 1 || name.length > 100) return privateJson({ error: { code: "invalid_request", message: "Collection names must be 1 to 100 characters." } }, 400);
    changes.name = name;
  }
  if ("description" in body && (typeof body.description === "string" || body.description === null)) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length > 500) return privateJson({ error: { code: "invalid_request", message: "Descriptions must be 500 characters or fewer." } }, 400);
    changes.description = description || null;
  }
  if (!Object.keys(changes).length) return privateJson({ error: { code: "invalid_request", message: "Collection details are required." } }, 400);
  const { data, error } = await auth.client.from("research_collections").update(changes).eq("user_id", auth.user.id).eq("id", id)
    .select("id,name,description,created_at,updated_at").maybeSingle();
  if (error?.code === "23505") return privateJson({ error: { code: "duplicate_collection", message: "You already have a collection with that name." } }, 409);
  if (error) return databaseError(error);
  if (!data) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  return privateJson({ collection: data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return privateJson({ error: { code: "not_found", message: "This collection is unavailable." } }, 404);
  const { error } = await auth.client.from("research_collections").delete().eq("user_id", auth.user.id).eq("id", id);
  if (error) return databaseError(error);
  return privateJson({ deleted: true });
}
