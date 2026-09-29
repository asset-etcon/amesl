/**
 * Applies the `post_comments` DDL and the `news_posts.allow_comments` column,
 * reading all of it straight out of sql/schema.sql so the SQL file stays the
 * single source of truth and this script can never drift from it.
 *
 * One section covers the whole feature. The `allow_comments` alter deliberately
 * lives in the post_comments section rather than in news_posts: `create table if
 * not exists` is a no-op against a database that already has news_posts, so a
 * migration that only ran the news_posts section would create no column at all
 * and the feature would fail at runtime rather than at deploy time.
 *
 * Every statement is idempotent (`add column if not exists`, `create table if
 * not exists`, `create index if not exists`), so re-running is safe.
 *
 *   npx tsx scripts/apply-comments-migration.mts
 *   npx tsx scripts/apply-comments-migration.mts --dry-run
 *
 * This connects with its own short-lived client rather than lib/db, because the
 * shared pool's connect budget is tight against Aiven and this is a one-shot
 * administrative task, not a request-path query.
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
      application_name: "amesl-migrate-comments",
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

const ddl = section("sql/schema.sql", "post_comments");

if (dryRun) {
  console.log("DRY RUN - nothing was executed.\n");
  console.log("=== sql/schema.sql :: post_comments ===\n" + ddl.trim());
  process.exit(0);
}

const client = await connect();
try {
  const beforeTable = await client.query("select to_regclass('public.post_comments') as tbl");
  const beforeColumn = await client.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'news_posts' and column_name = 'allow_comments'",
  );
  console.log(`post_comments table before: ${beforeTable.rows[0]?.tbl ? "exists" : "MISSING"}`);
  console.log(`news_posts.allow_comments before: ${beforeColumn.rowCount ? "exists" : "MISSING"}`);

  await client.query("begin");
  await client.query(ddl);
  await client.query("commit");
  console.log("applied in one transaction");

  const afterTable = await client.query("select to_regclass('public.post_comments') as tbl");
  const afterColumn = await client.query(
    "select column_name, data_type, column_default, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'news_posts' and column_name = 'allow_comments'",
  );
  console.log(`\npost_comments table after: ${afterTable.rows[0]?.tbl ? "exists" : "MISSING"}`);
  console.log(`news_posts.allow_comments after: ${JSON.stringify(afterColumn.rows[0] ?? null)}`);

  const constraint = await client.query(
    "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.post_comments'::regclass and contype = 'c'",
  );
  console.log("\ncheck constraints:");
  for (const r of constraint.rows) console.log(`  ${r.conname}: ${r.def}`);

  const indexes = await client.query("select indexname from pg_indexes where schemaname = 'public' and tablename = 'post_comments' order by indexname");
  console.log("\nindexes:");
  for (const r of indexes.rows) console.log(`  ${r.indexname}`);

  const counts = await client.query(
    "select (select count(*)::int from public.post_comments) as comments, (select count(*)::int from public.news_posts) as posts, (select count(*)::int from public.news_posts where allow_comments) as open",
  );
  console.log(
    `\ncomments: ${counts.rows[0]?.comments ?? 0}  |  posts: ${counts.rows[0]?.posts ?? 0}  |  posts with comments open: ${counts.rows[0]?.open ?? 0}`,
  );
  console.log("Existing articles stay closed; enable them per article in /admin/news.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("migration failed, rolled back:", (error as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
