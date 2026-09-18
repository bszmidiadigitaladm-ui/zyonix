"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { PLAN_CODES } from "@/lib/config";

interface Props {
  userId: string;
  email: string;
  fullName: string | null;
  hasSubscription: boolean;
  hasHotmartBilling: boolean;
  isPlainMember: boolean;
  isAdminTarget: boolean;
  banned: boolean;
}

type Message = { tone: "good" | "bad"; text: string } | null;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}
      <div className="mt-2 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function UserActions(props: Props) {
  const { userId, email, fullName, hasSubscription, hasHotmartBilling, isPlainMember, isAdminTarget, banned } = props;
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [plan, setPlan] = useState<string>(PLAN_CODES[1]);
  const [days, setDays] = useState(30);
  const [extendDays, setExtendDays] = useState(30);
  const [credits, setCredits] = useState({ image: 0, text: 0, video: 0 });
  const [newName, setNewName] = useState(fullName ?? "");
  const [newEmail, setNewEmail] = useState(email);
  const [confirmEmail, setConfirmEmail] = useState("");

  const reasonOk = reason.trim().length >= 5;
  const planLocked = isPlainMember || !hasSubscription;

  async function call(body: Record<string, unknown>, confirmText?: string, after?: () => void) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "bad", text: data.error ?? "Action failed" });
        return;
      }
      setMessage({ tone: "good", text: data.message ?? "Done" });
      if (after) after();
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ tone: "bad", text: data.error ?? "Export failed" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zyonix-data-${email}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ tone: "good", text: "Export downloaded (and logged)" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Actions</h2>
        <p className="mb-2 text-xs text-muted">
          Every action is recorded in the audit log with your reason. Under LGPD, state the legitimate purpose (e.g.
          “support ticket #123”, “data-subject request received by email on 12 Sep”).
        </p>
        <label className="mb-1 block text-sm font-medium" htmlFor="admin-reason">
          Reason (required)
        </label>
        <Textarea id="admin-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you doing this?" />
      </div>

      {message && (
        <p className={message.tone === "good" ? "text-sm text-accent" : "text-sm text-danger"} role="status">
          {message.text}
        </p>
      )}

      <Section
        title="Plan & access"
        hint={
          isPlainMember
            ? "This person is a team member: their access comes from the team owner's subscription."
            : hasHotmartBilling
              ? "Paid through Hotmart: extending or revoking access here does not change what Hotmart bills."
              : "Complimentary access has no billing attached."
        }
      >
        {!hasHotmartBilling && !isPlainMember && (
          <div className="flex flex-wrap items-end gap-2">
            <Select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-auto">
              {PLAN_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" aria-label="Days" />
            <span className="pb-2.5 text-sm text-muted">days</span>
            <Button disabled={busy || !reasonOk} onClick={() => call({ action: "grant_plan", plan_code: plan, days })}>
              Grant complimentary plan
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Input type="number" min={1} max={3650} value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} className="w-24" aria-label="Extend days" />
          <span className="pb-2.5 text-sm text-muted">days</span>
          <Button variant="secondary" disabled={busy || !reasonOk || planLocked} onClick={() => call({ action: "extend_plan", days: extendDays })}>
            Extend access
          </Button>
          <Button
            variant="danger"
            disabled={busy || !reasonOk || planLocked}
            onClick={() => call({ action: "revoke_plan" }, `Revoke access for ${email} right now?`)}
          >
            Revoke access
          </Button>
        </div>
      </Section>

      <Section title="Credits" hint="Adjustments are added to the current balance (negative numbers remove credits).">
        <div className="flex flex-wrap items-end gap-2">
          {(["image", "text", "video"] as const).map((kind) => (
            <label key={kind} className="flex flex-col gap-1 text-xs text-muted">
              {kind}
              <Input
                type="number"
                value={credits[kind]}
                onChange={(e) => setCredits((c) => ({ ...c, [kind]: Number(e.target.value) }))}
                className="w-24"
              />
            </label>
          ))}
          <Button variant="secondary" disabled={busy || !reasonOk || !hasSubscription} onClick={() => call({ action: "adjust_credits", ...credits })}>
            Apply
          </Button>
          <Button variant="secondary" disabled={busy || !reasonOk || !hasSubscription} onClick={() => call({ action: "reset_credits" }, "Reset credits to the full monthly allowance?")}>
            Reset to plan allowance
          </Button>
        </div>
      </Section>

      <Section title="Account" hint="Correcting personal data is a data-subject right (LGPD art. 18 III). Changing the email also changes the sign-in email, and the email is how Hotmart purchases are matched.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
          <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" />
        </div>
        <div>
          <Button
            variant="secondary"
            disabled={busy || !reasonOk || (newName === (fullName ?? "") && newEmail === email)}
            onClick={() =>
              call({
                action: "update_profile",
                ...(newName && newName !== (fullName ?? "") ? { full_name: newName } : {}),
                ...(newEmail !== email ? { email: newEmail } : {}),
              })
            }
          >
            Save changes
          </Button>
        </div>
        {!isAdminTarget && (
          <div>
            <Button
              variant={banned ? "secondary" : "danger"}
              disabled={busy || !reasonOk}
              onClick={() =>
                call({ action: banned ? "unban" : "ban" }, banned ? `Reinstate ${email}?` : `Suspend ${email}? They will not be able to sign in.`)
              }
            >
              {banned ? "Reinstate account" : "Suspend account"}
            </Button>
          </div>
        )}
      </Section>

      <Section
        title="Data-subject requests (LGPD)"
        hint="Fulfil a verified request from the account holder. Confirm the requester's identity first, and put the request reference in the reason."
      >
        <div>
          <Button variant="secondary" disabled={busy || !reasonOk} onClick={exportData}>
            Export all of this person&apos;s data (JSON)
          </Button>
        </div>
        {!isAdminTarget && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">Permanent deletion of the account and everything tied to it. Type the email to confirm.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={email} autoComplete="off" />
              <Button
                variant="danger"
                disabled={busy || !reasonOk || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
                onClick={() =>
                  call({ action: "delete_account", confirm_email: confirmEmail }, `Permanently delete ${email}? This cannot be undone.`, () =>
                    router.push("/admin/users"),
                  )
                }
              >
                Delete account
              </Button>
            </div>
          </div>
        )}
      </Section>
    </Card>
  );
}
