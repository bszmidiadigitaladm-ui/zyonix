import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTable, Badge, Td, fmtDate } from "@/components/admin/ui";
import { CrisisActions } from "@/components/admin/CrisisActions";

export default async function AdminCrisisPage() {
  await requireAdminPage();
  const admin = createAdminClient();

  const { data: flags } = await admin.from("crisis_flags").select("*").order("reviewed", { ascending: true }).order("created_at", { ascending: false }).limit(100);

  const userIds = [...new Set((flags ?? []).map((f) => f.user_id))];
  const { data: profiles } = userIds.length ? await admin.from("profiles").select("id, email").in("id", userIds) : { data: [] };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={HeartPulse}
        title="Crisis flags"
        subtitle="Messages the spiritual chat flagged as possible crisis. Open only the flagged message, only for safety review; each opening is logged."
      />

      <AdminTable head={["When", "Person", "Severity", "Detected by", "Status", "Review"]} empty="No flags. That's good news.">
        {(flags ?? []).map((f) => {
          const email = profiles?.find((p) => p.id === f.user_id)?.email;
          return (
            <tr key={f.id}>
              <Td className="whitespace-nowrap">{fmtDate(f.created_at, true)}</Td>
              <Td>
                {email ? (
                  <Link href={`/admin/users/${f.user_id}`} className="text-accent hover:underline">
                    {email}
                  </Link>
                ) : (
                  "deleted account"
                )}
              </Td>
              <Td>
                <Badge tone={f.severity === "high" ? "bad" : "warn"}>{f.severity}</Badge>
              </Td>
              <Td>{f.detection_source.replace("_", " ")}</Td>
              <Td>{f.reviewed ? <Badge tone="good">reviewed {fmtDate(f.reviewed_at)}</Badge> : <Badge tone="warn">to review</Badge>}</Td>
              <Td>
                <CrisisActions id={f.id} reviewed={f.reviewed} />
              </Td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
