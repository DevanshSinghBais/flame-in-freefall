import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, readSignInCredentials, safeReturnPath, validNasaId, validPassword } from "../src/lib/auth/validation.ts";
import { getVerifiedUser } from "../src/lib/server/auth-guard.ts";

test("return paths stay on the application origin", () => {
  assert.equal(safeReturnPath("/workspace/paper-library?tab=searches"), "/workspace/paper-library?tab=searches");
  assert.equal(safeReturnPath("//outside.example/path"), "/workspace/overview");
  assert.equal(safeReturnPath("/\\outside.example/path"), "/workspace/overview");
  assert.equal(safeReturnPath("https://outside.example/path"), "/workspace/overview");
});

test("email and password inputs are normalized and bounded", () => {
  assert.equal(normalizeEmail(" Scientist@Example.org "), "scientist@example.org");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(validPassword("12345678"), true);
  assert.equal(validPassword("short"), false);
  assert.equal(validPassword("x".repeat(129)), false);
});

test("sign-in reads the named email and password fields and preserves the password exactly", () => {
  const form = new FormData();
  form.append("email", " Scientist@Example.org ");
  form.append("password", "  Correct Horse 🛰️  ");

  assert.deepEqual(readSignInCredentials(form), {
    email: "scientist@example.org",
    password: "  Correct Horse 🛰️  ",
  });
});

test("sign-in rejects missing fields without coercing a non-text password", () => {
  const emptyForm = new FormData();
  assert.deepEqual(readSignInCredentials(emptyForm), { email: null, password: "" });

  const malformedForm = new FormData();
  malformedForm.append("email", "scientist@example.org");
  malformedForm.append("password", new Blob(["not a text field"]), "password.txt");
  assert.deepEqual(readSignInCredentials(malformedForm), { email: "scientist@example.org", password: "" });
});

test("NASA identifiers accept only nonzero numeric source IDs", () => {
  assert.equal(validNasaId("20200000557"), true);
  assert.equal(validNasaId("000"), false);
  assert.equal(validNasaId("../20200000557"), false);
});

test("server authorization requires a verified UUID subject from getClaims", async () => {
  const valid = await getVerifiedUser({ auth: { getClaims: async () => ({ data: { claims: { sub: "10000000-0000-4000-8000-000000000001", email: "a@example.test" } }, error: null }) } });
  assert.deepEqual(valid, { id: "10000000-0000-4000-8000-000000000001", email: "a@example.test" });

  const forged = await getVerifiedUser({ auth: { getClaims: async () => ({ data: { claims: { sub: "not-a-user-id" } }, error: null }) } });
  assert.equal(forged, null);
  const failed = await getVerifiedUser({ auth: { getClaims: async () => ({ data: { claims: { sub: "10000000-0000-4000-8000-000000000001" } }, error: new Error("invalid token") }) } });
  assert.equal(failed, null);
});
