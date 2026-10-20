import { databaseError, privateJson, requireApiUser } from "@/lib/server/api-auth";

const ALLOWED_FILTERS = ["stiType", "center", "subjectCategory"] as const;

function validFilters(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= ALLOWED_FILTERS.length && entries.every(([key, filter]) =>
    (ALLOWED_FILTERS as readonly string[]).includes(key) && typeof filter === "string" && filter.trim().length <= 120,
  );
}

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.client.from("saved_searches")
    .select("id,name,query,filters,created_at,updated_at").order("created_at", { ascending: false });
  if (error) return databaseError(error);
  return privateJson({ searches: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return privateJson({ error: { code: "invalid_request", message: "The saved search was not valid JSON." } }, 400); }
  if (typeof body !== "object" || body === null || !("query" in body) || typeof body.query !== "string" || !("filters" in body) || !validFilters(body.filters)) {
    return privateJson({ error: { code: "invalid_request", message: "A search query and supported filters are required." } }, 400);
  }
  const query = body.query.trim();
  const name = "name" in body && typeof body.name === "string" ? body.name.trim() : query;
  if (!query || query.length > 300 || !name || name.length > 100) {
    return privateJson({ error: { code: "invalid_request", message: "Search names must be 1 to 100 characters and queries 1 to 300 characters." } }, 400);
  }
  const { data, error } = await auth.client.from("saved_searches").insert({
    user_id: auth.user.id,
    name,
    query,
    filters: body.filters,
  }).select("id,name,query,filters,created_at,updated_at").single();
  if (error) return databaseError(error);
  return privateJson({ search: data }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return privateJson({ error: { code: "invalid_request", message: "A valid saved-search ID is required." } }, 400);
  }
  const { error } = await auth.client.from("saved_searches").delete().eq("user_id", auth.user.id).eq("id", id);
  if (error) return databaseError(error);
  return privateJson({ deleted: true });
}
