export function safeReturnPath(value: unknown, fallback = "/workspace/overview"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || /[\u0000-\u001f\\]/.test(value)) {
    return fallback;
  }
  try {
    const parsed = new URL(value, "https://flame-in-freefall.invalid");
    return parsed.origin === "https://flame-in-freefall.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function readSignInCredentials(formData: Pick<FormData, "get">): { email: string | null; password: string } {
  const rawPassword = formData.get("password");
  return {
    email: normalizeEmail(formData.get("email")),
    // Passwords are opaque values: preserve every character exactly as submitted.
    password: typeof rawPassword === "string" ? rawPassword : "",
  };
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

export function validNasaId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{1,20}$/.test(value) && !/^0+$/.test(value);
}
