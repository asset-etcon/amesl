"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams.toString()}`;
  const previousUrl = useRef(url);

  useEffect(() => {
    if (previousUrl.current === url) return;
    previousUrl.current = url;
    if (window.location.hash) return;
    // "instant" is required: "auto" resolves to the computed CSS value, which is smooth.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [url]);

  return null;
}
