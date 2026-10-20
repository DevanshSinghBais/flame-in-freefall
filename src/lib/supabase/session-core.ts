import { NextResponse, type NextRequest } from "next/server.js";

type CookieToSet = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };
export type SessionCookieAdapter = {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (cookiesToSet: CookieToSet[], headers?: Record<string, string>) => void;
};
type ClaimsSessionClient = { auth: { getClaims: () => Promise<unknown> } };
export type SessionClientFactory = (cookies: SessionCookieAdapter) => ClaimsSessionClient;

export async function refreshSessionWithFactory(request: NextRequest, clientFactory: SessionClientFactory) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const cookieAdapter: SessionCookieAdapter = {
    getAll: () => request.cookies.getAll(),
    setAll(cookiesToSet, headers) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      response.headers.set("Cache-Control", "private, no-store");
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      if (headers) {
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      }
    },
  };

  try {
    await clientFactory(cookieAdapter).auth.getClaims();
  } catch {
    // Do not block public research pages if token refresh is unavailable. Private
    // pages and APIs still fail closed when their own getClaims check runs.
  }
  return response;
}
