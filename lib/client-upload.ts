import { uploadAssetAction } from "@/app/actions/upload";

/**
 * Uploads a file straight from the browser to R2 via a server-issued
 * presigned PUT URL, then returns the final public URL.
 */
export async function uploadFileToStorage(
  kind: "productImages" | "productDocuments" | "media" | "brandLogos" | "heroImages",
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const prepared = await uploadAssetAction({ kind, fileName: file.name, contentType: file.type });
  if (!prepared.ok) return prepared;

  const put = await fetch(prepared.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) return { ok: false, error: `Upload failed (${put.status}).` };

  return { ok: true, url: prepared.url };
}