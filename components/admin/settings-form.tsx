"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, FormSection, Input, Textarea, useToast } from "@/components/admin/ui";
import { saveSettingsAction } from "@/app/admin/(dashboard)/settings/actions";
import { SETTING_KEYS } from "@/lib/settings";

type Values = Record<string, string>;

export function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<Values>(() => {
    const base: Values = {};
    for (const key of SETTING_KEYS) base[key] = initial[key] ?? "";
    return base;
  });
  const [saved, setSaved] = useState(() => JSON.stringify(values));
  const [pending, startTransition] = useTransition();

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const dirty = JSON.stringify(values) !== saved;

  const save = () => {
    startTransition(async () => {
      const result = await saveSettingsAction(values);
      if (result.ok) {
        setSaved(JSON.stringify(values));
        toast("Settings saved. Footer and contact details updated site-wide.");
        router.refresh();
      } else {
        toast(result.error ?? "Save failed.", "error");
      }
    });
  };

  return (
    <div className="grid max-w-3xl gap-6">
      <FormSection title="Company" description="Shown in the footer copyright and contact areas.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" required>
            <Input value={values.company_name} onChange={set("company_name")} />
          </Field>
          <Field label="Short name">
            <Input value={values.company_short_name} onChange={set("company_short_name")} />
          </Field>
        </div>
        <Field label="Footer summary" hint="One or two sentences describing the company.">
          <Textarea rows={3} maxLength={500} value={values.footer_about} onChange={set("footer_about")} />
        </Field>
        <Field label="Copyright text">
          <Input value={values.copyright_text} onChange={set("copyright_text")} />
        </Field>
      </FormSection>

      <FormSection title="Contact details" description="Used in the footer and on enquiry links across the site.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required>
            <Input type="email" value={values.email} onChange={set("email")} />
          </Field>
          <Field label="Primary phone">
            <Input value={values.phone_primary} onChange={set("phone_primary")} />
          </Field>
          <Field label="Secondary phone">
            <Input value={values.phone_secondary} onChange={set("phone_secondary")} />
          </Field>
          <Field label="Training portal URL">
            <Input placeholder="https://…" value={values.training_url} onChange={set("training_url")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Addresses" description="Head and operational office addresses shown in the footer.">
        <Field label="Head office">
          <Textarea rows={2} maxLength={500} value={values.address_head_office} onChange={set("address_head_office")} />
        </Field>
        <Field label="Operational office">
          <Textarea rows={2} maxLength={500} value={values.address_operations} onChange={set("address_operations")} />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setValues(JSON.parse(saved) as Values)} disabled={!dirty || pending}>
          Reset
        </Button>
        <Button onClick={save} busy={pending} disabled={!dirty}>
          Save settings
        </Button>
      </div>
    </div>
  );
}