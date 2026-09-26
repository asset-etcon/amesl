import { uploadAssetAction } from "@/app/actions/upload";
import type { StorageKind } from "@/lib/storage";

/**
 * Uploads a file straight from the browser to R2 via a server-issued
 * presigned PUT URL, then returns the final public URL.
 */
export async function uploadFileToStorage(
  kind: StorageKind,
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const prepared = await uploadAssetAction({ kind, fileName: file.name, contentType: file.type });
  if (!prepared.ok) return prepared;

  let put: Response;
  try {
    put = await fetch(prepared.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
  } catch {
    return { ok: false, error: "Upload failed: could not reach the storage server. Check your network and try again." };
  }
  if (!put.ok) return { ok: false, error: `Upload failed (${put.status}).` };

  return { ok: true, url: prepared.url };
}