export type SupabasePublicConfig = { url: string; publishableKey: string };

export function getSupabasePublicConfig(): SupabasePublicConfig {
  // Keep these as direct references so Next.js can inline the public values in
  // the browser bundle. These are the only Supabase values this app exposes.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing = [
    !url?.trim() ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !publishableKey?.trim() ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter((name): name is string => name !== null);

  if (missing.length) {
    throw new Error(`Missing Supabase configuration variable(s): ${missing.join(", ")}`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url!);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL.");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS outside local development.");
  }

  return { url: parsedUrl.origin, publishableKey: publishableKey!.trim() };
}
