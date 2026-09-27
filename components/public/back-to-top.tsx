"use client";

export function BackToTop() {
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0 })}>
      Back to top ↑
    </button>
  );
}
