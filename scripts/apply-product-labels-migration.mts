/**
 * Applies the `product_labels` and `product_label_assignments` DDL plus the
 * label seed rows, reading all of it straight out of sql/schema.sql and
 * sql/seed.sql so the SQL files stay the single source of truth and this script
 * can never drift from them.
 *
 * Every statement in those sections is idempotent (`create table if not exists`,
 * `create index if not exists`, `drop trigger if exists` before `create trigger`,
 * and `on conflict (slug) do nothing`), so re-running is safe.
 *
 *   npx tsx scripts/apply-product-labels-migration.mts
 *   npx tsx scripts/apply-product-labels-migration.mts --dry-run
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
      application_name: "amesl-migrate-labels",
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

const ddlLabels = section("sql/schema.sql", "product_labels");
const ddlAssignments = section("sql/schema.sql", "product_label_assignments");
const seed = section("sql/seed.sql", "product_labels");

if (dryRun) {
  console.log("DRY RUN - nothing was executed.\n");
  console.log("=== sql/schema.sql :: product_labels ===\n" + ddlLabels.trim());
  console.log("\n=== sql/schema.sql :: product_label_assignments ===\n" + ddlAssignments.trim());
  console.log("\n=== sql/seed.sql :: product_labels ===\n" + seed.trim());
  process.exit(0);
}

const client = await connect();
try {
  for (const table of ["product_labels", "product_label_assignments"]) {
    const before = await client.query("select to_regclass($1) as tbl", [`public.${table}`]);
    console.log(`${table} table before: ${before.rows[0]?.tbl ? "exists" : "MISSING"}`);
  }

  await client.query("begin");
  await client.query(ddlLabels);
  await client.query(ddlAssignments);
  await client.query(seed);
  await client.query("commit");
  console.log("applied schema + seed in one transaction");

  const after = await client.query(
    "select name, slug, status, display_order from public.product_labels order by display_order, name",
  );
  console.log(`\n${after.rowCount} labels in the database:`);
  for (const r of after.rows) {
    console.log(`  ${String(r.display_order).padStart(2)}  ${r.slug.padEnd(26)} ${r.status}`);
  }

  const assignments = await client.query("select count(*)::int as n from public.product_label_assignments");
  console.log(`\nassignments: ${assignments.rows[0]?.n ?? 0} (products need labels set in the admin)`);
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("migration failed, rolled back:", (error as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
