import Link from "next/link";
import { DollarSign, HeartPulse, LayoutDashboard, Timer, UserPlus, Users, CreditCard, Gift } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AdminTable, Td, fmtDate } from "@/components/admin/ui";
import { daysAgoIso } from "@/lib/admin/time";

const ACTIVE = ["active", "trialing", "past_due"];

export default async function AdminOverviewPage() {
  await requireAdminPage();
  const admin = createAdminClient();
  const since7 = daysAgoIso(7);
  const since30 = daysAgoIso(30);

  const [total, new7, new30, subsRes, plansRes, pending, crisis, usage, adminsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("subscriptions").select("*").limit(10000),
    admin.from("plans").select("code, display_name, monthly_price_usd, annual_monthly_equivalent_usd"),
    admin.from("pending_activations").select("id", { count: "exact", head: true }),
    admin.from("crisis_flags").select("id", { count: "exact", head: true }).eq("reviewed", false),
    admin.from("ai_usage_log").select("estimated_cost_usd").gte("created_at", since30).limit(50000),
    admin.from("admin_users").select("user_id, note, created_at"),
  ]);

  const plans = plansRes.data ?? [];
  const subs = subsRes.data ?? [];
  const paying = subs.filter((s) => ACTIVE.includes(s.status) && s.source !== "admin_grant");
  const comped = subs.filter((s) => ACTIVE.includes(s.status) && s.source === "admin_grant");

  // Revenue is an estimate from list prices: it ignores taxes, Hotmart fees, coupons and refunds.
  let mrr = 0;
  const byPlan = new Map<string, { name: string; active: number; monthly: number; annual: number; comped: number }>();
  for (const plan of plans) byPlan.set(plan.code, { name: plan.display_name, active: 0, monthly: 0, annual: 0, comped: 0 });
  for (const s of paying) {
    const plan = plans.find((p) => p.code === s.plan_code);
    const row = byPlan.get(s.plan_code);
    if (!plan || !row) continue;
    row.active++;
    if (s.billing_cycle === "annual") row.annual++;
    else row.monthly++;
    mrr += s.billing_cycle === "annual" && plan.annual_monthly_equivalent_usd ? plan.annual_monthly_equivalent_usd : plan.monthly_price_usd;
  }
  for (const s of comped) {
    const row = byPlan.get(s.plan_code);
    if (row) row.comped++;
  }

  const aiCost30 = (usage.data ?? []).reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0);

  const adminIds = (adminsRes.data ?? []).map((a) => a.user_id);
  const { data: adminProfiles } = adminIds.length
    ? await admin.from("profiles").select("id, email").in("id", adminIds)
    : { data: [] as { id: string; email: string }[] };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={LayoutDashboard} title="Overview" subtitle="Live numbers straight from the database" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} value={total.count ?? 0} label="Total accounts" />
        <StatCard icon={UserPlus} value={`${new7.count ?? 0} / ${new30.count ?? 0}`} label="New accounts (7d / 30d)" />
        <StatCard icon={CreditCard} value={paying.length} label="Paying subscribers" />
        <StatCard icon={DollarSign} value={`$${mrr.toFixed(2)}`} label="Estimated MRR (list price)" />
        <StatCard icon={Gift} value={comped.length} label="Complimentary plans active" />
        <StatCard icon={Timer} value={pending.count ?? 0} label="Purchases waiting for signup" />
        <StatCard icon={HeartPulse} value={crisis.count ?? 0} label="Crisis flags to review" />
        <StatCard icon={DollarSign} value={`$${aiCost30.toFixed(2)}`} label="AI cost, last 30 days (estimated)" />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Subscribers by plan</h2>
      <AdminTable head={["Plan", "Paying", "Monthly", "Annual", "Complimentary"]}>
        {[...byPlan.values()].map((row) => (
          <tr key={row.name}>
            <Td className="font-medium">{row.name}</Td>
            <Td>{row.active}</Td>
            <Td>{row.monthly}</Td>
            <Td>{row.annual}</Td>
            <Td>{row.comped}</Td>
          </tr>
        ))}
      </AdminTable>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Administrators</h2>
      <AdminTable head={["Email", "Note", "Since"]}>
        {(adminsRes.data ?? []).map((a) => (
          <tr key={a.user_id}>
            <Td>{adminProfiles?.find((p) => p.id === a.user_id)?.email ?? a.user_id}</Td>
            <Td>{a.note ?? "—"}</Td>
            <Td>{fmtDate(a.created_at)}</Td>
          </tr>
        ))}
      </AdminTable>
      <p className="mt-2 text-xs text-muted">
        Administrators are added or removed only by SQL in the Supabase editor, on purpose.{" "}
        <Link href="/admin/audit" className="text-accent hover:underline">
          See the audit log
        </Link>
      </p>
    </div>
  );
}
