export type VerifiedUser = { id: string; email: string | null };

export type ClaimsClient = {
  auth: {
    getClaims: () => Promise<{
      data: { claims?: unknown } | null;
      error: unknown | null;
    }>;
  };
};

export async function getVerifiedUser(client: ClaimsClient): Promise<VerifiedUser | null> {
  try {
    const { data, error } = await client.auth.getClaims();
    const claims = data?.claims;
    if (typeof claims !== "object" || claims === null) return null;
    const claimRecord = claims as Record<string, unknown>;
    const subject = claimRecord.sub;
    if (error || typeof subject !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subject)) {
      return null;
    }
    const email = claimRecord.email;
    return { id: subject, email: typeof email === "string" ? email : null };
  } catch {
    return null;
  }
}
