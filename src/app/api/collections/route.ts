import { databaseError, privateJson, requireApiUser } from "@/lib/server/api-auth";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { data: collections, error } = await auth.client.from("research_collections")
    .select("id,name,description,created_at,updated_at").order("updated_at", { ascending: false });
  if (error) return databaseError(error);
  const ids = (collections ?? []).map((item) => item.id);
  if (!ids.length) return privateJson({ collections: [] });
  const { data: items, error: itemError } = await auth.client.from("collection_items")
    .select("collection_id").in("collection_id", ids);
  if (itemError) return databaseError(itemError);
  const counts = new Map<string, number>();
  for (const item of items ?? []) counts.set(item.collection_id, (counts.get(item.collection_id) ?? 0) + 1);
  return privateJson({ collections: (collections ?? []).map((item) => ({ ...item, itemCount: counts.get(item.id) ?? 0 })) });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return privateJson({ error: { code: "invalid_request", message: "The collection request was not valid JSON." } }, 400); }
  if (typeof body !== "object" || body === null || !("name" in body) || typeof body.name !== "string") {
    return privateJson({ error: { code: "invalid_request", message: "A collection name is required." } }, 400);
  }
  const name = body.name.trim();
  const description = "description" in body && typeof body.description === "string" ? body.description.trim() : "";
  if (name.length < 1 || name.length > 100 || description.length > 500) {
    return privateJson({ error: { code: "invalid_request", message: "Use a collection name up to 100 characters and description up to 500 characters." } }, 400);
  }
  const { data, error } = await auth.client.from("research_collections").insert({
    user_id: auth.user.id,
    name,
    description: description || null,
  }).select("id,name,description,created_at,updated_at").single();
  if (error?.code === "23505") return privateJson({ error: { code: "duplicate_collection", message: "You already have a collection with that name." } }, 409);
  if (error) return databaseError(error);
  return privateJson({ collection: { ...data, itemCount: 0 } }, 201);
}
