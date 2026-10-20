import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { refreshSessionWithFactory } from "../src/lib/supabase/session-core.ts";

const createRequest = () => new NextRequest("https://flame.test/workspace/overview", {
  headers: { cookie: "before=old" },
});

test("session refresh applies refreshed cookies to the request and response", async () => {
  const request = createRequest();
  let claimsChecked = false;
  const response = await refreshSessionWithFactory(request, (cookies) => ({
    auth: {
      getClaims: async () => {
        claimsChecked = true;
        cookies.setAll([
          { name: "sb-project-auth-token", value: "refreshed", options: { httpOnly: true, path: "/" } },
        ], { "Cache-Control": "private, no-store" });
        return { data: { claims: { sub: "user-id" } }, error: null };
      },
    },
  }));

  assert.equal(claimsChecked, true);
  assert.equal(request.cookies.get("sb-project-auth-token")?.value, "refreshed");
  assert.equal(response.cookies.get("sb-project-auth-token")?.value, "refreshed");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("refresh failure does not block public request continuation", async () => {
  const response = await refreshSessionWithFactory(createRequest(), () => ({
    auth: { getClaims: async () => { throw new Error("upstream unavailable"); } },
  }));

  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.cookies.getAll().length, 0);
});
