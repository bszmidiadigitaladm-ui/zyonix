import Link from "next/link";
import { Mail } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTable, Td, fmtDate } from "@/components/admin/ui";
import { daysAgoIso } from "@/lib/admin/time";

// Abuse monitoring for the church email feature: who sent how much, never the
// message bodies or the recipients' addresses (those are third parties' data).
export default async function AdminCommunicationsPage() {
  await requireAdminPage();
  const admin = createAdminClient();
  const since30 = daysAgoIso(30);

  const { data: recent } = await admin
    .from("communications")
    .select("id, team_id, sent_by, subject, template_type, recipient_count, created_at")
    .gte("created_at", since30)
    .order("created_at", { ascending: false })
    .limit(500);

  const teamIds = [...new Set((recent ?? []).map((c) => c.team_id))];
  const senderIds = [...new Set((recent ?? []).map((c) => c.sent_by))];
  const [{ data: teams }, { data: senders }] = await Promise.all([
    teamIds.length ? admin.from("teams").select("id, name").in("id", teamIds) : { data: [] },
    senderIds.length ? admin.from("profiles").select("id, email").in("id", senderIds) : { data: [] },
  ]);

  const perTeam = new Map<string, { sends: number; recipients: number }>();
  for (const c of recent ?? []) {
    const row = perTeam.get(c.team_id) ?? { sends: 0, recipients: 0 };
    row.sends++;
    row.recipients += c.recipient_count;
    perTeam.set(c.team_id, row);
  }
  const ranking = [...perTeam.entries()].sort((a, b) => b[1].recipients - a[1].recipients).slice(0, 10);
  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? "deleted team";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={Mail} title="Church emails" subtitle="Sending volume over the last 30 days, to spot abuse of our sending domain" />

      <h2 className="mb-3 text-lg font-semibold">Top senders</h2>
      <AdminTable head={["Team", "Messages", "Recipients reached"]} empty="No church emails were sent in the last 30 days.">
        {ranking.map(([teamId, row]) => (
          <tr key={teamId}>
            <Td className="font-medium">{teamName(teamId)}</Td>
            <Td>{row.sends}</Td>
            <Td>{row.recipients}</Td>
          </tr>
        ))}
      </AdminTable>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Latest sends</h2>
      <AdminTable head={["When", "Team", "Sent by", "Subject", "Type", "Recipients"]} empty="Nothing sent yet.">
        {(recent ?? []).slice(0, 50).map((c) => (
          <tr key={c.id}>
            <Td className="whitespace-nowrap">{fmtDate(c.created_at, true)}</Td>
            <Td>{teamName(c.team_id)}</Td>
            <Td>
              <Link href={`/admin/users/${c.sent_by}`} className="text-accent hover:underline">
                {senders?.find((s) => s.id === c.sent_by)?.email ?? "deleted account"}
              </Link>
            </Td>
            <Td>{c.subject}</Td>
            <Td>{c.template_type.replace("_", " ")}</Td>
            <Td>{c.recipient_count}</Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
