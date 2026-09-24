// Creates (or updates) an admin Super Admin account in PostgreSQL.
// Usage: npm run create-admin <email> <password> [full-name]
//
// Reads DATABASE_URL, SESSION_* (unused here) from .env.local and uses bcrypt
// to store the password hash in the profiles table (matching the app login).
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";

function loadEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

const [, , emailArg, passwordArg, nameArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error("Usage: npm run create-admin <email> <password> [full-name]");
  process.exit(1);
}

loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url || url.includes("REPLACE_WITH")) {
  console.error("Missing or unset DATABASE_URL in .env.local. Configure it first.");
  process.exit(1);
}

if (passwordArg.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const fullName = nameArg || "Super Admin";
const id = crypto.randomUUID();
const passwordHash = await bcrypt.hash(passwordArg, 10);

// Drop sslmode so our explicit ssl config governs TLS (Aiven self-signed CA).
const connection = new URL(url);
connection.searchParams.delete("sslmode");

const pool = new pg.Pool({
  connectionString: connection.toString(),
  ssl: process.env.PG_SSL === "false" ? false : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10_000,
});

let inserted = false;
try {
  const { rowCount } = await pool.query(
    `insert into profiles (id, email, password_hash, full_name, role, is_deleted)
     values ($1, $2, $3, $4, 'super_admin', false)
     on conflict (email)
     do update set password_hash = excluded.password_hash,
                   full_name = excluded.full_name,
                   role = 'super_admin',
                   is_deleted = false,
                   updated_at = now()`,
    [id, email, passwordHash, fullName]
  );
  inserted = rowCount === 1;

  if (inserted) {
    console.log(`Created Super Admin ${email}.`);
  } else {
    console.log(`Promoted existing account ${email} to Super Admin.`);
  }

  const validate = await pool.query("select role, full_name from profiles where email = $1", [email]);
  if (validate.rows.length === 0 || validate.rows[0].role !== "super_admin") {
    console.error("Verification failed: profile not found or role not set.");
    process.exitCode = 1;
  } else {
    console.log("Done. Sign in at /admin/login");
  }
} catch (err) {
  console.error("Failed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  await pool.end();
}