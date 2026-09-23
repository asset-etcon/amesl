"use client";

import { useState } from "react";
import { QuoteModal, type QuoteProduct } from "@/components/public/quote-modal";

export function QuoteButton({ product, className = "", label = "Request a quote" }: { product: QuoteProduct; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <QuoteModal open={open} product={product} onClose={() => setOpen(false)} />
    </>
  );
}