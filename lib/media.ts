const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_DOC_MIME = ["application/pdf"];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export function isImageMime(mime: string): boolean {
  return ACCEPTED_IMAGE_MIME.includes(mime);
}

export function isDocMime(mime: string): boolean {
  return ACCEPTED_DOC_MIME.includes(mime);
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) return "Only JPG, PNG or WEBP images are allowed.";
  if (file.size > MAX_IMAGE_BYTES) return "Image exceeds the 5 MB limit.";
  return null;
}

export function validateDocFile(file: File): string | null {
  if (!ACCEPTED_DOC_MIME.includes(file.type)) return "Only PDF documents are allowed.";
  if (file.size > MAX_DOC_BYTES) return "Document exceeds the 10 MB limit.";
  return null;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionFor(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}