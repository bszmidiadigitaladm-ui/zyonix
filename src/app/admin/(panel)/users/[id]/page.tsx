import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, UserRound } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AdminTable, Badge, KeyValue, Td, fmtDate, statusTone } from "@/components/admin/ui";
import { UserActions } from "@/components/admin/UserActions";
import { daysAgoIso, isFutureDate } from "@/lib/admin/time";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const since30 = daysAgoIso(30);
  const subQuery = admin.from("subscriptions").select("*");

  const [{ data: authRes }, { data: adminRow }, { data: sub }, team, pending, audit, usage, arts, outlines, chats] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from("admin_users").select("user_id").eq("user_id", id).maybeSingle(),
    profile.team_id ? subQuery.eq("team_id", profile.team_id).maybeSingle() : subQuery.eq("owner_id", id).is("team_id", null).maybeSingle(),
    profile.team_id ? admin.from("teams").select("id, name, owner_id").eq("id", profile.team_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("pending_activations").select("*").eq("email", profile.email),
    admin.from("admin_audit_log").select("*").eq("target_user_id", id).order("created_at", { ascending: false }).limit(15),
    admin.from("ai_usage_log").select("estimated_cost_usd").eq("user_id", id).gte("created_at", since30).limit(20000),
    admin
      .from("bible_art_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("status", "completed"),
    admin.from("message_outlines").select("id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("spiritual_chat_conversations").select("id", { count: "exact", head: true }).eq("user_id", id),
  ]);

  const authUser = authRes?.user;
  const { data: balance } = sub ? await admin.from("credits_balance").select("*").eq("subscription_id", sub.id).maybeSingle() : { data: null };
  const memberCount = profile.team_id
    ? (await admin.from("profiles").select("id", { count: "exact", head: true }).eq("team_id", profile.team_id)).count
    : null;

  const banned = isFutureDate(authUser?.banned_until);
  const isPlainMember = Boolean(profile.team_id && profile.team_role !== "owner");
  const hasHotmartBilling = Boolean(sub?.hotmart_subscriber_code || sub?.hotmart_transaction_code);
  const aiCost = (usage.data ?? []).reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> All users
      </Link>
      <PageHeader icon={UserRound} title={profile.full_name ?? profile.email} subtitle={profile.email} />

      <div className="mb-4 flex flex-wrap gap-2">
        {adminRow && <Badge tone="warn">administrator</Badge>}
        {banned && <Badge tone="bad">suspended</Badge>}
        {authUser && !authUser.email_confirmed_at && <Badge tone="warn">email not confirmed</Badge>}
        {(pending.data?.length ?? 0) > 0 && <Badge tone="warn">has a purchase waiting for this email</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Account</h2>
            <dl>
              <KeyValue label="User ID">{profile.id}</KeyValue>
              <KeyValue label="Joined">{fmtDate(authUser?.created_at ?? profile.created_at, true)}</KeyValue>
              <KeyValue label="Last sign-in">{fmtDate(authUser?.last_sign_in_at, true)}</KeyValue>
              <KeyValue label="Sign-in method">{(authUser?.app_metadata?.providers as string[] | undefined)?.join(", ") ?? "—"}</KeyValue>
              <KeyValue label="Daily reminder">{profile.daily_reminder_enabled ? `on (${profile.reminder_slot})` : "off"}</KeyValue>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Subscription</h2>
            {sub ? (
              <dl>
                <KeyValue label="Plan">
                  {sub.plan_code} {sub.source === "admin_grant" && <Badge tone="warn">complimentary</Badge>}
                </KeyValue>
                <KeyValue label="Status">
                  <Badge tone={statusTone(sub.status)}>{sub.status}</Badge>
                </KeyValue>
                <KeyValue label="Billing">{sub.billing_cycle}</KeyValue>
                <KeyValue label="Current period ends">{fmtDate(sub.current_period_end, true)}</KeyValue>
                <KeyValue label="Hotmart subscriber">{sub.hotmart_subscriber_code ?? "—"}</KeyValue>
                <KeyValue label="Hotmart transaction">{sub.hotmart_transaction_code ?? "—"}</KeyValue>
                <KeyValue label="Credits left">
                  {balance ? `${balance.image_credits_remaining} image · ${balance.text_credits_remaining} text · ${balance.video_credits_remaining} video` : "—"}
                </KeyValue>
                <KeyValue label="Credits refresh">{fmtDate(sub.credits_cycle_end)}</KeyValue>
              </dl>
            ) : (
              <p className="text-sm text-muted">No subscription.</p>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Team & activity</h2>
            <dl>
              <KeyValue label="Team">
                {team.data ? `${team.data.name} (${profile.team_role}, ${memberCount} member${memberCount === 1 ? "" : "s"})` : "—"}
              </KeyValue>
              <KeyValue label="AI cost, last 30 days">${aiCost.toFixed(2)}</KeyValue>
              <KeyValue label="Bible art created">{arts.count ?? 0}</KeyValue>
              <KeyValue label="Message outlines">{outlines.count ?? 0}</KeyValue>
              <KeyValue label="Spiritual chat conversations">{chats.count ?? 0}</KeyValue>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Counts only. The content of chats, prayers and notes is never shown here; the only message an administrator can open is one
              flagged for crisis safety, with a reason, and that access is logged.
            </p>
          </Card>
        </div>

        <UserActions
          userId={profile.id}
          email={profile.email}
          fullName={profile.full_name}
          hasSubscription={Boolean(sub)}
          hasHotmartBilling={hasHotmartBilling}
          isPlainMember={isPlainMember}
          isAdminTarget={Boolean(adminRow)}
          banned={banned}
        />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Admin activity on this account</h2>
      <AdminTable head={["When", "Admin", "Action", "Reason"]} empty="No administrative activity recorded for this account.">
        {(audit.data ?? []).map((a) => (
          <tr key={a.id}>
            <Td className="whitespace-nowrap">{fmtDate(a.created_at, true)}</Td>
            <Td>{a.admin_email}</Td>
            <Td>{a.action}</Td>
            <Td>{a.reason ?? "—"}</Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
