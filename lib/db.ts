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

function createPool(): Pool {
  return new Pool({
    connectionString: assertDatabaseUrl(),
    ssl: PG_SSL ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX) || 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
}

declare global {
  var __ameslPool: Pool | undefined;
}

export const pool: Pool = globalThis.__ameslPool ?? (globalThis.__ameslPool = createPool());

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export * as tableDefs from "@/db/schema";