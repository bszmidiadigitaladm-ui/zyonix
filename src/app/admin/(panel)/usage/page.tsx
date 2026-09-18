import Link from "next/link";
import { Activity } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminTable, Td } from "@/components/admin/ui";
import { daysAgoIso } from "@/lib/admin/time";

export default async function AdminUsagePage() {
  await requireAdminPage();
  const admin = createAdminClient();
  const since30 = daysAgoIso(30);

  const { data: rows } = await admin
    .from("ai_usage_log")
    .select("user_id, plan_code, feature, estimated_cost_usd, created_at")
    .gte("created_at", since30)
    .limit(50000);

  const usage = rows ?? [];
  const cost = (r: { estimated_cost_usd: number | null }) => Number(r.estimated_cost_usd ?? 0);

  const group = <K extends string>(keyOf: (r: (typeof usage)[number]) => K) => {
    const map = new Map<K, { count: number; cost: number }>();
    for (const r of usage) {
      const row = map.get(keyOf(r)) ?? { count: 0, cost: 0 };
      row.count++;
      row.cost += cost(r);
      map.set(keyOf(r), row);
    }
    return [...map.entries()].sort((a, b) => b[1].cost - a[1].cost);
  };

  const byFeature = group((r) => r.feature);
  const byPlan = group((r) => r.plan_code);
  const byUser = group((r) => r.user_id).slice(0, 10);
  const byDay = group((r) => r.created_at.slice(0, 10)).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);
  const total = usage.reduce((s, r) => s + cost(r), 0);

  const { data: topProfiles } = byUser.length
    ? await admin.from("profiles").select("id, email").in("id", byUser.map(([id]) => id))
    : { data: [] };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={Activity}
        title="AI usage"
        subtitle={`Last 30 days · ${usage.length} requests · $${total.toFixed(2)} estimated cost (from the usage log, not the provider's invoice)`}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">By feature</h2>
          <AdminTable head={["Feature", "Requests", "Cost"]}>
            {byFeature.map(([k, v]) => (
              <tr key={k}>
                <Td>{k.replace("_", " ")}</Td>
                <Td>{v.count}</Td>
                <Td>${v.cost.toFixed(2)}</Td>
              </tr>
            ))}
          </AdminTable>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">By plan</h2>
          <AdminTable head={["Plan", "Requests", "Cost"]}>
            {byPlan.map(([k, v]) => (
              <tr key={k}>
                <Td>{k}</Td>
                <Td>{v.count}</Td>
                <Td>${v.cost.toFixed(2)}</Td>
              </tr>
            ))}
          </AdminTable>
        </div>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Biggest spenders</h2>
      <AdminTable head={["Account", "Requests", "Cost"]}>
        {byUser.map(([id, v]) => (
          <tr key={id}>
            <Td>
              <Link href={`/admin/users/${id}`} className="text-accent hover:underline">
                {topProfiles?.find((p) => p.id === id)?.email ?? id}
              </Link>
            </Td>
            <Td>{v.count}</Td>
            <Td>${v.cost.toFixed(2)}</Td>
          </tr>
        ))}
      </AdminTable>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Last 14 days</h2>
      <AdminTable head={["Day", "Requests", "Cost"]}>
        {byDay.map(([day, v]) => (
          <tr key={day}>
            <Td>{day}</Td>
            <Td>{v.count}</Td>
            <Td>${v.cost.toFixed(2)}</Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
