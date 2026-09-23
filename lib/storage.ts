import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const STORAGE_PREFIXES = {
  productImages: "products",
  productDocuments: "documents",
  media: "media",
  brandLogos: "brands",
  heroImages: "hero",
} as const;

export type StorageKind = keyof typeof STORAGE_PREFIXES;

const bucketName = () => process.env.R2_BUCKET_NAME ?? "";
const publicBase = () => (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

declare global {
  var __ameslR2: S3Client | undefined;
}

function assertR2Configured() {
  const missing = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
  ].filter((key) => !process.env[key] || process.env[key]!.includes("REPLACE_WITH"));
  if (missing.length) {
    throw new Error(`Cloudflare R2 is not configured. Set ${missing.join(", ")} in .env.local and restart.`);
  }
}

function client(): S3Client {
  assertR2Configured();
  if (!globalThis.__ameslR2) {
    globalThis.__ameslR2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID ?? ""}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return globalThis.__ameslR2;
}

export function objectKeyFor(kind: StorageKind, fileName: string): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase().slice(0, 10) ?? "bin" : "bin";
  const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? ext : "bin";
  return `${STORAGE_PREFIXES[kind]}/${crypto.randomUUID()}.${safeExt}`;
}

export function publicUrlFor(key: string): string {
  return `${publicBase()}/${key}`;
}

/** Strips the public-host prefix from a stored URL, returning the object key. */
export function keyFromUrl(url: string): string | null {
  const base = publicBase();
  if (!base) return null;
  if (!url.startsWith(`${base}/`)) return null;
  return url.slice(base.length + 1);
}

export async function createSignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), command, { expiresIn: 300 });
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}