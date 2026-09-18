import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTable, Td, fmtDate } from "@/components/admin/ui";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  await requireAdminPage();
  const { target } = await searchParams;
  const admin = createAdminClient();

  let query = admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(300);
  if (target && /^[0-9a-f-]{36}$/i.test(target)) query = query.eq("target_user_id", target);
  const { data: entries, error } = await query;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={ScrollText}
        title="Audit log"
        subtitle="Every administrative access and action. Append-only: entries can't be edited or deleted, not even by the database owner's code."
      />

      {target && (
        <p className="mb-4 text-sm text-muted">
          Filtered to one account.{" "}
          <Link href="/admin/audit" className="text-accent hover:underline">
            Show everything
          </Link>
        </p>
      )}

      {error ? (
        <p className="rounded-2xl border border-border p-4 text-sm text-muted">Could not read the audit log — is migration 0039 applied?</p>
      ) : (
        <AdminTable head={["When", "Admin", "Action", "Account", "Reason", "Details"]} empty="Nothing recorded yet.">
          {(entries ?? []).map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{fmtDate(e.created_at, true)}</Td>
              <Td>{e.admin_email}</Td>
              <Td className="font-mono text-xs">{e.action}</Td>
              <Td>
                {e.target_user_id ? (
                  <Link href={`/admin/audit?target=${e.target_user_id}`} className="text-accent hover:underline">
                    {e.target_email ?? e.target_user_id}
                  </Link>
                ) : (
                  (e.target_email ?? "—")
                )}
              </Td>
              <Td>{e.reason ?? "—"}</Td>
              <Td className="max-w-xs font-mono text-[11px] break-all text-muted">{e.details ? JSON.stringify(e.details) : "—"}</Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
