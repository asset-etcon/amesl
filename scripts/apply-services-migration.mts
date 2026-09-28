/**
 * Applies the `services` table DDL and its seed rows, reading both straight
 * out of sql/schema.sql and sql/seed.sql so the SQL files stay the single
 * source of truth and this script can never drift from them.
 *
 * Every statement in those sections is idempotent (`create table if not
 * exists`, `create index if not exists`, `drop trigger if exists` before
 * `create trigger`, and `on conflict (slug) do nothing`), so re-running is safe.
 *
 *   npx tsx scripts/apply-services-migration.mts
 *   npx tsx scripts/apply-services-migration.mts --dry-run
 *
 * This connects with its own short-lived client rather than lib/db, because the
 * shared pool's 15s connect budget is tight against Aiven and this is a
 * one-shot administrative task, not a request-path query.
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const dryRun = process.argv.includes("--dry-run");

/**
 * Pulls one `-- ---------- name ----------` section out of a SQL file, stopping
 * at the next section marker or end of file.
 */
function section(file: string, name: string): string {
  const text = readFileSync(file, "utf8");
  const start = text.indexOf(`-- ---------- ${name} ----------`);
  if (start === -1) throw new Error(`Section "${name}" not found in ${file}`);
  const rest = text.slice(start);
  const next = rest.slice(1).search(/^-- ---------- /m);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

function connectionString(): string {
  const url = new URL(process.env.DATABASE_URL ?? "");
  // pg-connection-string treats sslmode=require as verify-full and overrides the
  // ssl object below, which breaks Aiven's certificate. Strip it; see lib/db.ts.
  url.searchParams.delete("sslmode");
  return url.toString();
}

async function connect(): Promise<Client> {
  const lastError: unknown[] = [];
  for (let attempt = 1; attempt <= 4; attempt++) {
    const client = new Client({
      connectionString: connectionString(),
      ssl: process.env.PG_SSL !== "false" ? { rejectUnauthorized: false } : false,
      application_name: "amesl-migrate",
      connectionTimeoutMillis: 60_000,
    });
    try {
      await client.connect();
      if (attempt > 1) console.log(`  connected on attempt ${attempt}`);
      return client;
    } catch (error) {
      lastError.push(error);
      console.log(`  connect attempt ${attempt} failed: ${(error as Error).message}`);
      await client.end().catch(() => {});
    }
  }
  throw lastError[lastError.length - 1];
}

const ddl = section("sql/schema.sql", "services");
const seed = section("sql/seed.sql", "services");

if (dryRun) {
  console.log("DRY RUN - nothing was executed.\n");
  console.log("=== sql/schema.sql :: services ===\n" + ddl.trim());
  console.log("\n=== sql/seed.sql :: services ===\n" + seed.trim());
  process.exit(0);
}

const client = await connect();
try {
  const before = await client.query("select to_regclass('public.services') as tbl");
  const existed = Boolean(before.rows[0]?.tbl);
  console.log(`services table before: ${existed ? "exists" : "MISSING"}`);

  await client.query("begin");
  await client.query(ddl);
  await client.query(seed);
  await client.query("commit");
  console.log("applied schema + seed in one transaction");

  const after = await client.query(
    "select name, slug, icon, display_order, status from public.services order by display_order",
  );
  console.log(`\n${after.rowCount} services in the database:`);
  for (const r of after.rows) {
    console.log(`  ${String(r.display_order).padStart(2)}  ${r.slug.padEnd(40)} ${r.icon.padEnd(12)} ${r.status}`);
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("migration failed, rolled back:", (error as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
