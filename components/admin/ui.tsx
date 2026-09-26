"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Button ---------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  busy?: boolean;
};

export function Button({ variant = "primary", size = "md", busy, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-3 text-[12px]" : "h-10 px-4 text-[12px]",
        variant === "primary" && "bg-[#e7a42b] text-[#172633] hover:bg-[#f3bb4e]",
        variant === "accent" && "bg-[#e7a42b] text-[#172633] hover:bg-[#f3bb4e]",
        variant === "outline" && "border border-[#e7a42b] bg-[#e7a42b] text-[#172633] hover:bg-[#f3bb4e]",
        variant === "ghost" && "bg-[#e7a42b] text-[#172633] hover:bg-[#f3bb4e]",
        variant === "danger" && "bg-[#dc2626] text-white hover:bg-[#b91c1c]",
        className
      )}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- Badge ---------- */
type Tone = "gray" | "green" | "amber" | "blue" | "red" | "navy";

const toneClass: Record<Tone, string> = {
  gray: "bg-[#eef1f0] text-[#5a6a72]",
  green: "bg-[#e7f6ec] text-[#177245]",
  amber: "bg-[#fdf3e0] text-[#9a6b12]",
  blue: "bg-[#e8f0f7] text-[#1d4f7d]",
  red: "bg-[#fdeceb] text-[#b3261e]",
  navy: "bg-[#0b1b29] text-white",
};

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5", toneClass[tone], className)}>
      {children}
    </span>
  );
}

export const productStatusTone: Record<string, Tone> = {
  draft: "gray",
  published: "green",
  archived: "amber",
};

export const quoteStatusTone: Record<string, Tone> = {
  new: "blue",
  contacted: "amber",
  quotation_sent: "navy",
  negotiating: "amber",
  completed: "green",
  cancelled: "red",
};

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]", className)}>{children}</div>;
}

/* ---------- Form field primitives ---------- */
export const inputClass =
  "h-10 w-full rounded-lg border border-[#d7dee0] bg-white px-3 text-[13.5px] text-[#152431] outline-none transition-colors placeholder:text-[#9aa6ab] focus:border-[#0b1b29] focus:ring-2 focus:ring-[#0b1b29]/10 disabled:bg-[#f2f4f3]";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "h-auto min-h-[120px] py-2.5 leading-6", props.className)} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputClass, "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2341551b%22 stroke-width=%222%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[right_12px_center] bg-no-repeat pr-9")}>
      {children}
    </select>
  );
}

export function Field({ label, error, hint, required, children, className }: { label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12px] font-bold text-[#41515b]">
        {label} {required && <span className="text-[#c2410c]">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-[#8a969c]">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] font-semibold text-[#dc2626]">{error}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
    >
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-[#0b1b29]" : "bg-[#cdd6d9]")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
      {label && <span className="text-[12px] font-semibold text-[#41515b]">{label}</span>}
    </button>
  );
}

/* ---------- Spinner / EmptyState / PageHeader ---------- */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 size={20} className={cn("animate-spin text-[#0b1b29]", className)} />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d5dddf] bg-[#fafbfa] px-6 py-14 text-center">
      <h3 className="text-[15px] font-bold text-[#152431]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-6 text-[#65727a]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-[19px] font-extrabold tracking-tight text-[#0b1b29] sm:text-[22px]">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-[#65727a]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <h2 className="text-[15px] font-bold text-[#0b1b29]">{title}</h2>
      {description && <p className="mt-0.5 text-[12.5px] text-[#65727a]">{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onMouseDown={onClose}>
      <div
        className={cn("my-auto w-full rounded-2xl bg-white shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[#eef1f0] px-5 py-4">
          <h2 className="text-[15px] font-extrabold text-[#0b1b29]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg bg-[#e7a42b] p-1.5 text-[#172633] hover:bg-[#f3bb4e]">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#eef1f0] px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- ConfirmDialog ---------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  busy = false,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} busy={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 text-[13.5px] leading-6 text-[#41515b]">
        {danger && <AlertTriangle className="mt-0.5 shrink-0 text-[#dc2626]" size={18} />}
        <div>{message}</div>
      </div>
    </Modal>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12.5px] text-[#65727a]">
      <span>{total.toLocaleString()} total</span>
      <div className="flex items-center gap-2">
        <span>
          Page {page} of {pageCount}
        </span>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-[#e7a42b] bg-[#e7a42b] px-2.5 py-1 text-[12px] text-[#172633] disabled:opacity-40">
          Prev
        </button>
        <button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className="rounded-lg border border-[#e7a42b] bg-[#e7a42b] px-2.5 py-1 text-[12px] text-[#172633] disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastTone) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const toastIcon = { success: CheckCircle2, error: AlertTriangle, info: Info };
const toastIconColor = { success: "text-[#177245]", error: "text-[#dc2626]", info: "text-[#1d4f7d]" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* inset rather than right-anchored, so a long message cannot run off the
          edge of a phone screen */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end">
        {items.map((item) => {
          const Icon = toastIcon[item.tone];
          return (
            <div key={item.id} className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-[#e4e9ea] bg-white px-4 py-3 text-[13px] font-semibold text-[#152431] shadow-lg">
              <Icon size={17} className={toastIconColor[item.tone]} />
              {item.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
