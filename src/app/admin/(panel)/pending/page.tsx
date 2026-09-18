import { Timer } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTable, Badge, Td, fmtDate } from "@/components/admin/ui";
import { PendingActions } from "@/components/admin/PendingActions";

export default async function AdminPendingPage() {
  await requireAdminPage();
  const admin = createAdminClient();

  const [{ data: pending }, events] = await Promise.all([
    admin.from("pending_activations").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("hotmart_events").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  // Which of the waiting emails already have an account? If so, the buyer just needs the plan attached.
  const emails = (pending ?? []).map((p) => p.email);
  const { data: existing } = emails.length ? await admin.from("profiles").select("id, email").in("email", emails) : { data: [] };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Timer}
        title="Pending purchases"
        subtitle="Paid on Hotmart, but no account with that email yet. The plan activates by itself when they sign up with the same email."
      />

      <AdminTable head={["Paid with", "Plan", "Transaction", "Since", "Account exists?", ""]} empty="No purchases are waiting.">
        {(pending ?? []).map((p) => (
          <tr key={p.id}>
            <Td className="font-medium">{p.email}</Td>
            <Td>
              {p.plan_code} {p.is_annual && <Badge>annual</Badge>}
            </Td>
            <Td className="font-mono text-xs">{p.transaction_code ?? "—"}</Td>
            <Td className="whitespace-nowrap">{fmtDate(p.created_at, true)}</Td>
            <Td>{existing?.some((e) => e.email === p.email) ? <Badge tone="warn">yes — attach it</Badge> : <Badge>not yet</Badge>}</Td>
            <Td>
              <PendingActions id={p.id} paidWith={p.email} />
            </Td>
          </tr>
        ))}
      </AdminTable>

      <h2 className="mt-10 mb-1 text-lg font-semibold">Recent Hotmart events</h2>
      <p className="mb-3 text-xs text-muted">The webhook&apos;s idempotency ledger: one row per purchase or cancellation already processed.</p>
      {events.error ? (
        <p className="rounded-2xl border border-border p-4 text-sm text-muted">
          The events table isn&apos;t available yet — apply migration 0038 in Supabase.
        </p>
      ) : (
        <AdminTable head={["Key", "Event", "When"]} empty="No events recorded yet.">
          {(events.data ?? []).map((e) => (
            <tr key={e.dedupe_key}>
              <Td className="font-mono text-xs">{e.dedupe_key}</Td>
              <Td>{e.event}</Td>
              <Td className="whitespace-nowrap">{fmtDate(e.created_at, true)}</Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
