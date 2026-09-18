import Link from "next/link";
import { Users } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTable, Badge, Td, fmtDate, statusTone } from "@/components/admin/ui";

const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdminPage();
  const { q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const term = q.trim().replace(/[%,()]/g, " ").slice(0, 100);

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, full_name, team_id, team_role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);

  const { data: users, count } = await query;

  // One subscription lookup for the whole page: solo users by owner, team members by team.
  const ids = (users ?? []).map((u) => u.id);
  const teamIds = [...new Set((users ?? []).map((u) => u.team_id).filter((t): t is string => Boolean(t)))];
  const [soloSubs, teamSubs] = await Promise.all([
    ids.length ? admin.from("subscriptions").select("*").in("owner_id", ids).is("team_id", null) : { data: [] },
    teamIds.length ? admin.from("subscriptions").select("*").in("team_id", teamIds) : { data: [] },
  ]);
  const subFor = (u: { id: string; team_id: string | null }) =>
    u.team_id ? teamSubs.data?.find((s) => s.team_id === u.team_id) : soloSubs.data?.find((s) => s.owner_id === u.id);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (p: number) => `/admin/users?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(p) })}`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={Users} title="Users" subtitle={`${count ?? 0} account${count === 1 ? "" : "s"}${term ? ` matching “${term}”` : ""}`} />

      <form className="mb-5 flex gap-2" action="/admin/users">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search by email or name"
          className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/60"
        />
        <button type="submit" className="rounded-full border border-border bg-surface px-5 py-2 text-sm hover:border-accent/50">
          Search
        </button>
      </form>

      <AdminTable head={["Email", "Name", "Plan", "Status", "Team role", "Joined"]} empty="No accounts match.">
        {(users ?? []).map((u) => {
          const sub = subFor(u);
          return (
            <tr key={u.id} className="hover:bg-surface-raised/40">
              <Td>
                <Link href={`/admin/users/${u.id}`} className="font-medium text-accent hover:underline">
                  {u.email}
                </Link>
              </Td>
              <Td>{u.full_name ?? "—"}</Td>
              <Td>
                {sub ? (
                  <span className="flex items-center gap-1.5">
                    {sub.plan_code}
                    {sub.source === "admin_grant" && <Badge tone="warn">comp</Badge>}
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td>{sub ? <Badge tone={statusTone(sub.status)}>{sub.status}</Badge> : <Badge>no plan</Badge>}</Td>
              <Td>{u.team_role ?? "—"}</Td>
              <Td>{fmtDate(u.created_at)}</Td>
            </tr>
          );
        })}
      </AdminTable>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-3">
            {page > 1 && (
              <Link href={link(page - 1)} className="text-accent hover:underline">
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={link(page + 1)} className="text-accent hover:underline">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
