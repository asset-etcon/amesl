import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "amesl_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "insecure-dev-secret-change-me");
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verifies a session JWT and returns the user id, or null when the token is
 * missing, expired or its signature does not match. Pure cryptographic
 * verification — safe to run in middleware without touching the database.
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}