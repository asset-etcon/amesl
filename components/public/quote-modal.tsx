"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { submitQuoteAction } from "@/app/actions/quote";

export interface QuoteProduct {
  id: string;
  name: string;
  brand_name?: string;
}

interface Props {
  open: boolean;
  product: QuoteProduct | null;
  onClose: () => void;
}

const initial = { name: "", email: "", phone: "", company: "", quantity: "1", message: "", website: "" };

export function QuoteModal({ open, product, onClose }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setOpenedAt(Date.now());
      setForm(initial);
      setErrors({});
      setDone(false);
    }, 0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const set = (key: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (form.phone.trim().length < 7) next.phone = "Please enter a valid phone number.";
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) next.quantity = "Quantity must be at least 1.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate() || !product) return;
    startTransition(async () => {
      const res = await submitQuoteAction({
        product_id: product.id,
        product_name: product.name,
        brand_name: product.brand_name ?? "",
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        company_name: form.company.trim(),
        message: form.message.trim(),
        quantity: Math.max(1, Math.floor(Number(form.quantity) || 1)),
        website: form.website,
        started_at: openedAt || undefined,
      });
      if (res.ok) setDone(true);
      else setErrors({ name: res.error ?? "Could not submit your request. Please try again." });
    });
  };

  if (!open) return null;

  return (
    <div className="quote-modal" role="dialog" aria-modal="true" aria-label="Request a quote">
      <div className="qm-backdrop" onClick={onClose} />
      <div className="qm-panel">
        {done ? (
          <div className="qm-success">
            <span className="qm-check"><Check size={26} /></span>
            <h3>Request received</h3>
            <p>Thanks {form.name.split(" ")[0] || "there"} — your quote request for <strong>{product?.name}</strong> has been sent. Our engineering team will get back to you within one business day.</p>
            <button type="button" className="button button-dark" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="qm-head">
              <div>
                <p className="qm-eyebrow">{product?.brand_name || "Asset Matrix Energy"}</p>
                <h3>Request a quote</h3>
                <p className="qm-sub">{product?.name}</p>
              </div>
              <button type="button" className="qm-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="qm-grid">
              <div className="qm-trap" aria-hidden="true">
                <label>
                  <span>Website</span>
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
                </label>
              </div>
              <label className="qm-field qm-span">
                <span>Full name *</span>
                <input value={form.name} onChange={set("name")} placeholder="e.g. Ada Obi" />
                {errors.name && <em>{errors.name}</em>}
              </label>
              <label className="qm-field">
                <span>Email *</span>
                <input type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" />
                {errors.email && <em>{errors.email}</em>}
              </label>
              <label className="qm-field">
                <span>Phone *</span>
                <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+234 …" />
                {errors.phone && <em>{errors.phone}</em>}
              </label>
              <label className="qm-field">
                <span>Company</span>
                <input value={form.company} onChange={set("company")} placeholder="Optional" />
              </label>
              <label className="qm-field">
                <span>Quantity</span>
                <input type="number" min={1} value={form.quantity} onChange={set("quantity")} />
                {errors.quantity && <em>{errors.quantity}</em>}
              </label>
              <label className="qm-field qm-span">
                <span>How can we help?</span>
                <textarea rows={4} value={form.message} onChange={set("message")} placeholder="Tell us about your application, lead times or anything else we should know." />
              </label>
            </div>
            <div className="qm-actions">
              <button type="button" className="button button-ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="button button-accent" onClick={submit} disabled={pending}>
                {pending ? <Loader2 size={16} className="spin" /> : "Submit request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}