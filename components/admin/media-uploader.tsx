"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { isDocMime, isImageMime, MAX_DOC_BYTES, MAX_IMAGE_BYTES } from "@/lib/media";
import { uploadFileToStorage } from "@/lib/client-upload";
import { recordMediaAction } from "@/app/admin/(dashboard)/media/actions";
import { Button, useToast } from "@/components/admin/ui";

function imageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (!isImageMime(file.type)) return resolve({ width: null, height: null });
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    img.src = url;
  });
}

export function MediaUploader() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let uploaded = 0;
    let failed = 0;

    for (const file of Array.from(files)) {
      const accepted = isImageMime(file.type) || isDocMime(file.type);
      const maxBytes = isImageMime(file.type) ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
      if (!accepted || file.size > maxBytes) {
        failed += 1;
        toast(`${file.name}: ${!accepted ? "Only JPG, PNG, WEBP or PDF allowed." : "File exceeds the size limit."}`, "error");
        continue;
      }

      const uploadResult = await uploadFileToStorage("media", file);
      if (!uploadResult.ok) {
        failed += 1;
        toast(`${file.name}: ${uploadResult.error}`, "error");
        continue;
      }
      const dims = await imageDimensions(file);
      const result = await recordMediaAction({
        name: file.name,
        url: uploadResult.url,
        file_type: isImageMime(file.type) ? file.type : "application/pdf",
        size_bytes: file.size,
        width: dims.width,
        height: dims.height,
      });
      if (result.ok) uploaded += 1;
      else {
        failed += 1;
        toast(`${file.name}: ${result.error}`, "error");
      }
    }

    setBusy(false);
    if (uploaded) {
      toast(`${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.`);
      startTransition(() => router.refresh());
    }
    if (!uploaded && !failed) toast("No files selected.", "error");
  };

  return (
    <>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />
      <Button type="button" onClick={() => inputRef.current?.click()} busy={busy}>
        <Upload size={15} /> {busy ? "Uploading…" : "Upload files"}
      </Button>
    </>
  );
}