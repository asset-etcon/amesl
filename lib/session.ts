import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "amesl_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Placeholder used only when SESSION_SECRET is absent. It is a public constant,
 * so a deployment missing SESSION_SECRET would accept sessions forged by anyone
 * who has read this file. `assertSessionSecret` turns that silent catastrophe
 * into a loud startup failure; it is called from the auth entry points.
 */
const INSECURE_DEV_SECRET = "insecure-dev-secret-change-me";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? INSECURE_DEV_SECRET);
}

/**
 * Fails closed when SESSION_SECRET is missing or still the placeholder outside
 * development. Without this, a forgotten env var produces a site whose session
 * cookies anyone can mint, and nothing in the logs says so.
 */
export function assertSessionSecret(): void {
  if (process.env.NODE_ENV !== "production") return; // dev may use the placeholder
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === INSECURE_DEV_SECRET) {
    throw new Error("SESSION_SECRET is not set. Generate one with `openssl rand -base64 32` and restart.");
  }
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