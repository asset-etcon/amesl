"use client";

import { useState } from "react";
import Image from "next/image";

interface GalleryImage {
  url: string;
  alt: string;
}

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const safe = images.length ? images : [{ url: "", alt: "" }];
  const current = safe[Math.min(active, safe.length - 1)];

  return (
    <div>
      <div className="pd-gallery-main">
        {current.url ? (
          <Image src={current.url} alt={current.alt || "Product image"} fill priority sizes="(max-width: 800px) 100vw, 55vw" unoptimized />
        ) : (
          <span className="pd-gallery-empty">Image coming soon</span>
        )}
      </div>
      {safe.length > 1 && (
        <div className="pd-thumbs">
          {safe.map((img, i) => (
            <button key={i} type="button" className={`pd-thumb${i === active ? " is-active" : ""}`} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}>
              {img.url ? <Image src={img.url} alt={img.alt || ""} fill sizes="70px" unoptimized /> : <span />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}