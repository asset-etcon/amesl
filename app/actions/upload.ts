"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { actionErrorMessage, rethrowIfControlFlow } from "@/lib/action-guard";
import { createSignedUploadUrl, objectKeyFor, publicUrlFor } from "@/lib/storage";
import type { StorageKind } from "@/lib/storage";

const kindSchema = z.enum(["productImages", "productDocuments", "media", "brandLogos", "heroImages", "newsImages"]);
const contentTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const fileNameSchema = z.string().trim().min(1).max(160);

export type UploadAssetResult = { ok: true; url: string; uploadUrl: string } | { ok: false; error: string };

/**
 * Prepares an upload by issuing an R2 presigned PUT URL. The browser streams
 * the file directly to object storage; we never hold bytes on the server.
 */
export async function uploadAssetAction(input: { kind: string; fileName: string; contentType: string }): Promise<UploadAssetResult> {
  // Authorisation runs *outside* the try: `requireRole` redirects unauthenticated
  // callers by throwing, and a blanket catch would swallow that signal.
  await requireRole("media");

  try {
    const parsed = z
      .object({ kind: kindSchema, contentType: contentTypeSchema, fileName: fileNameSchema })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: "Unsupported file type or name." };

    const key = objectKeyFor(parsed.data.kind as StorageKind, parsed.data.fileName);
    const uploadUrl = await createSignedUploadUrl(key, parsed.data.contentType);
    return { ok: true, url: publicUrlFor(key), uploadUrl };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not prepare the upload.") };
  }
}
