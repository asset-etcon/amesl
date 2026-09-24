"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import { Badge, Button, ConfirmDialog, Field, Input, Modal, Select, useToast } from "@/components/admin/ui";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { addUserAction, deleteUserAction, setUserRoleAction } from "@/app/admin/(dashboard)/users/actions";

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

const ROLES: Role[] = ["super_admin", "product_manager", "content_manager", "sales"];

export function UsersTable({ rows, currentUserId }: { rows: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (promise: Promise<{ ok: boolean; error?: string }>, success: string) => {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast(success);
        router.refresh();
      } else {
        toast(result.error ?? "Failed.", "error");
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus size={15} /> Add user
        </Button>
      </div>

      <div className="rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eef1f0] text-[11px] font-extrabold uppercase tracking-wide text-[#8a969c]">
              <th className="px-4 py-3">User</th>
              <th className="hidden px-4 py-3 sm:table-cell">Added</th>
              <th className="px-4 py-3">Role</th>
              <th className="w-[90px] px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f2f1]">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef1f0] text-[12px] font-extrabold text-[#41515b]">
                      {(row.full_name || row.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-[13.5px] font-bold text-[#152431]">
                        {row.full_name || "—"}
                        {row.id === currentUserId && <span className="ml-2 text-[11px] font-semibold text-[#8a969c]">(you)</span>}
                      </p>
                      <p className="text-[11.5px] text-[#8a969c]">{row.email}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-[12.5px] text-[#65727a] sm:table-cell">{new Date(row.created_at).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={row.role === "super_admin" ? "green" : "gray"}>{ROLE_LABELS[row.role]}</Badge>
                    <Select
                      value={row.role}
                      disabled={pending}
                      className="h-8 w-[170px] text-[12.5px]"
                      onChange={(e) => {
                        const next = e.target.value as Role;
                        if (next !== row.role) run(setUserRoleAction(row.id, next), `Role updated to ${ROLE_LABELS[next]}.`);
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </Select>
                  </div>
                  <p className="mt-0.5 max-w-[340px] text-[11px] text-[#8a969c]">{ROLE_DESCRIPTIONS[row.role]}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      aria-label="Delete user"
                      title={row.id === currentUserId ? "You cannot delete yourself" : "Delete user"}
                      disabled={row.id === currentUserId}
                      onClick={() => setDeleteTarget(row)}
                      className="rounded-lg bg-[#b3261e] p-2 text-white hover:bg-[#991b1b] disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => toast("User created.")} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user"
        confirmLabel="Delete user"
        danger
        busy={pending}
        message={
          <>
            Remove <strong>{deleteTarget?.email}</strong>? They will lose access to the dashboard immediately. This cannot be undone.
          </>
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          run(deleteUserAction(target.id), "User deleted.");
        }}
      />
    </>
  );
}

function AddUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "sales" as Role });
  const [busy, startTransition] = useTransition();

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    startTransition(async () => {
      const result = await addUserAction(form);
      if (result.ok) {
        onCreated();
        setForm({ email: "", password: "", full_name: "", role: "sales" });
        onClose();
      } else {
        toast(result.error ?? "Could not create user.", "error");
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add user">
      <div className="grid gap-4">
        <Field label="Full name" required>
          <Input value={form.full_name} onChange={set("full_name")} placeholder="e.g. Chinedu Okafor" />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={set("email")} placeholder="user@assetmatrixenergy.com" />
        </Field>
        <Field label="Temporary password" required hint="Minimum 8 characters. Share it securely; the user can change it later.">
          <Input type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" autoComplete="new-password" />
        </Field>
        <Field label="Role" hint={ROLE_DESCRIPTIONS[form.role]}>
          <Select value={form.role} onChange={set("role")}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} busy={busy}>
          Create user
        </Button>
      </div>
    </Modal>
  );
}