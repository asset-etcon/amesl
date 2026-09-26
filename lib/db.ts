import { Pool, types } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

// Aiven returns timestamptz as text; normalise it to UTC ISO-8601 strings so
// the whole app keeps working with the `string` timestamp types we expose.
types.setTypeParser(
  1184,
  (value) => {
    const stamp = new Date(value);
    return Number.isNaN(stamp.getTime()) ? value : stamp.toISOString();
  }
);
types.setTypeParser(1114, (value) => {
  const stamp = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(stamp.getTime()) ? value : stamp.toISOString();
});

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const PG_SSL = process.env.PG_SSL !== "false";

function withoutPassword(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url;
  }
}

function assertDatabaseUrl(): string {
  if (!DATABASE_URL || DATABASE_URL.includes("REPLACE_WITH")) {
    throw new Error("DATABASE_URL is not configured. Set your Aiven PostgreSQL connection string in .env.local (e.g. postgres://user:password@host:port/defaultdb?sslmode=require) and restart.");
  }
  try {
    const u = new URL(DATABASE_URL);
    const port = Number(u.port);
    if (!u.port || Number.isNaN(port)) throw new Error("invalid port");
  } catch {
    throw new Error(`Invalid DATABASE_URL connection string: ${withoutPassword(DATABASE_URL)}`);
  }
  return DATABASE_URL;
}

// pg-connection-string v2 treats sslmode=require/prefer as verify-full and it
// overrides any ssl object we pass, which breaks Aiven's self-signed certs.
// Strip the param so our explicit SSL config below governs TLS.
function connectionString(): string {
  const u = new URL(assertDatabaseUrl());
  u.searchParams.delete("sslmode");
  return u.toString();
}

/**
 * Aiven's smallest plans cap Postgres at `max_connections = 20`, reserve 3 for
 * superusers, and hold ~13 slots for their own internal backends and monitoring.
 * That leaves roughly 4 usable connections for this application, and every
 * process that opens a pool spends from the same budget — on Vercel each
 * serverless instance builds its own pool. Keep the default small and return
 * connections quickly: requests queue on the pool, which is correct, whereas
 * exceeding the server limit fails every query at once.
 *
 * Set PG_POOL_MAX=1 to be safe with several concurrent instances on a small
 * plan, or raise the Aiven plan before increasing it.
 */
function poolMax(): number {
  const configured = Number(process.env.PG_POOL_MAX);
  if (Number.isFinite(configured) && configured > 0) return Math.min(configured, 10);
  return process.env.NODE_ENV === "production" ? 2 : 3;
}

function createPool(): Pool {
  return new Pool({
    connectionString: connectionString(),
    ssl: PG_SSL ? { rejectUnauthorized: false } : false,
    max: poolMax(),
    // Makes this app's connections identifiable in pg_stat_activity when
    // diagnosing a full server.
    application_name: "amesl",
    // Queue for a free slot rather than failing immediately when one is scarce.
    connectionTimeoutMillis: 15_000,
    // Hand slots back to Postgres quickly so idle bursts do not hold capacity.
    idleTimeoutMillis: 10_000,
    // Recycle connections periodically; long-lived proxies drop idle sockets.
    maxUses: 500,
    // A stuck query must not pin one of the few available slots.
    statement_timeout: 10_000,
  });
}

declare global {
  var __ameslPool: Pool | undefined;
}

export const pool: Pool = globalThis.__ameslPool ?? (globalThis.__ameslPool = createPool());

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export * as tableDefs from "@/db/schema";