"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { submitCommentAction } from "@/app/actions/comments";

const initial = { name: "", email: "", body: "", website: "" };

/** Wire field name -> form state key, for pointing errors at the right input. */
const FIELD_TO_FORM: Record<string, keyof typeof initial> = {
  author_name: "name",
  author_email: "email",
  body: "body",
  post_id: "body",
  website: "body",
};

interface Props {
  postId: string;
  /** Passed in rather than imported so this stays a small client bundle. */
  nameMax: number;
  bodyMax: number;
}

/**
 * The public comment form.
 *
 * Deliberately not react-hook-form: that is an admin dependency, and this ships
 * to every article reader. The hand-rolled validate() mirrors the quote modal's,
 * and the server validates the same rules again with Zod — the client check is a
 * courtesy, never the gate.
 */
export function CommentForm({ postId, nameMax, bodyMax }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  // Client clock at mount, sent with the submission so the server can reject
  // something completed instantly. Kept in a ref so changing the form does not
  // reset the clock and let a bot re-time itself.
  const startedAt = useRef(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = (key: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (form.body.trim().length < 3) next.body = "Please write a little more than that.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    startTransition(async () => {
      const res = await submitCommentAction({
        post_id: postId,
        author_name: form.name.trim(),
        author_email: form.email.trim(),
        body: form.body.trim(),
        website: form.website,
        started_at: startedAt.current || undefined,
      });
      if (res.ok) {
        setDone(true);
        // The action already revalidated the article server-side, but a client
        // that has not navigated shows the thread it was handed. Without this the
        // success message claims the comment is "live below" and nothing new is
        // there until the reader hits refresh themselves.
        router.refresh();
        return;
      }
      // The action names the offending field using the payload's own keys, which
      // are not the form's: the wire format says author_name, the input says
      // name. Mapping explicitly is what keeps a bad email reported under the
      // email box instead of under the comment box.
      const field = res.field ? (FIELD_TO_FORM[res.field] ?? "body") : "body";
      setErrors({ [field]: res.error ?? "Could not post your comment. Please try again." });
    });
  };

  if (done) {
    return (
      <div className="cm-done" role="status">
        <span className="cm-check"><Check size={20} /></span>
        <div>
          <h4>Comment posted</h4>
          <p>
            Thanks {form.name.split(" ")[0] || "there"} — your comment is live below. Your email address is not published.
          </p>
        </div>
      </div>
    );
  }

  const remaining = bodyMax - form.body.length;

  return (
    <form className="cm-form" onSubmit={submit} noValidate>
      <div className="cm-row">
        <label className="cm-field">
          <span>Name</span>
          <input
            type="text"
            value={form.name}
            onChange={set("name")}
            maxLength={nameMax}
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <em>{errors.name}</em> : null}
        </label>

        <label className="cm-field">
          <span>Email <small>not published</small></span>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            maxLength={160}
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? <em>{errors.email}</em> : null}
        </label>
      </div>

      <label className="cm-field">
        <span>Comment</span>
        <textarea
          value={form.body}
          onChange={set("body")}
          rows={5}
          maxLength={bodyMax}
          required
          aria-invalid={Boolean(errors.body)}
          aria-describedby="cm-count"
        />
        {errors.body ? <em>{errors.body}</em> : null}
      </label>

      {/* Honeypot. Hidden from people, invisible to nothing else. */}
      <div className="cm-trap" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </label>
      </div>

      <div className="cm-actions">
        <p className="cm-count" id="cm-count" aria-live="polite">
          {remaining < 200 ? `${remaining} characters left` : ""}
        </p>
        <button type="submit" className="button button-dark" disabled={pending}>
          {pending ? <><Loader2 size={15} className="spin" /> Posting…</> : "Post comment"}
        </button>
      </div>
    </form>
  );
}
