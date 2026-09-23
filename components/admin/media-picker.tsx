"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { listMediaAction } from "@/app/admin/(dashboard)/media/actions";
import { Modal, Spinner } from "@/components/admin/ui";

export interface MediaPickerAsset {
  id: string;
  name: string;
  url: string;
  file_type: string;
}

export function MediaPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (url: string) => void }) {
  const [items, setItems] = useState<MediaPickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listMediaAction();
      if (!result.ok) throw new Error(result.error);
      setItems(result.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [open, load]);

  const pick = (asset: MediaPickerAsset) => {
    onSelect(asset.url);
    onClose();
  };

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <Modal open={open} onClose={onClose} title="Browse media library" wide>
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-[13px] text-[#b3261e]">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[#8a969c]">No media uploaded yet. Upload files in the Media library, then pick them here.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => pick(item)}
              className="group flex flex-col overflow-hidden rounded-lg border border-[#e4e9ea] bg-white text-left transition-colors hover:border-[#0b1b29]"
            >
              <div className="relative flex h-16 items-center justify-center overflow-hidden bg-[#f2f4f3] sm:h-20">
                {isImage(item.file_type) ? (
                  <Image src={item.url} alt={item.name} fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-[10px] font-bold uppercase text-[#8a969c]">{item.file_type}</span>
                )}
              </div>
              <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-[#41515b]">{item.name}</p>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}