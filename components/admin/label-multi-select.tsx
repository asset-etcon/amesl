"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LabelOption {
  id: string;
  name: string;
}

export interface LabelMultiSelectProps {
  options: LabelOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Text on the trigger when nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  emptyHint?: React.ReactNode;
}

/**
 * A checkable dropdown for assigning any number of labels.
 *
 * A native <select multiple> is unusable on touch and needs Ctrl/Cmd to select
 * more than one option, so this renders a listbox of real checkboxes behind a
 * summary button. The button reports the current selection rather than closing,
 * which is what makes picking several labels in one visit practical.
 *
 * Assignment order is click order, matching how images/specs/docs are held in
 * the product form, and is what product_label_assignments.display_order stores.
 */
export function LabelMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "No labels selected",
  disabled = false,
  emptyHint,
}: LabelMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Any click outside, or Escape, closes the panel. Registered on document in the
  // capture phase so it fires before the click reaches whatever is underneath.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectedNames = selected
    .map((id) => options.find((o) => o.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  if (options.length === 0) {
    return emptyHint ? <div className="text-[12.5px] text-[#8a969c]">{emptyHint}</div> : null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          "flex min-h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-[12.5px] font-semibold transition-colors",
          open ? "border-[#e7a42b] ring-2 ring-[#e7a42b]/25" : "border-[#e4e9ea] hover:border-[#cfd7d9]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {selectedNames.length === 0 ? (
          <span className="font-normal text-[#8a969c]">{placeholder}</span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selectedNames.map((name) => (
              <span key={name} className="inline-flex items-center rounded-full bg-[#f7f2e7] px-2 py-0.5 text-[11px] font-bold text-[#a07a2e]">
                {name}
              </span>
            ))}
          </span>
        )}
        {selectedNames.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            title="Clear all labels"
            aria-label="Clear all labels"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }
            }}
            className="shrink-0 rounded p-0.5 text-[#8a969c] hover:bg-[#f2f4f3] hover:text-[#152431]"
          >
            <X size={13} />
          </span>
        )}
        <ChevronDown size={15} className={cn("shrink-0 text-[#8a969c] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#e4e9ea] bg-white p-1 shadow-[0_12px_32px_rgba(10,28,39,0.14)]"
        >
          {options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12.5px] font-semibold transition-colors",
                  checked ? "bg-[#fdf3e0] text-[#172633]" : "text-[#41515b] hover:bg-[#f2f4f3]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border",
                    checked ? "border-[#e7a42b] bg-[#e7a42b] text-[#172633]" : "border-[#cfd7d9] bg-white",
                  )}
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
                {option.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
