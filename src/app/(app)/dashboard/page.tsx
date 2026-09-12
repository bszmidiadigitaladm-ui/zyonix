import Link from "next/link";
import { requireOnboardedUser, resolveCreditOwnerId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { CreditMeter } from "@/components/billing/CreditMeter";

interface ActivityItem {
  id: string;
  type: "art" | "post" | "devotional_note" | "chat";
  label: string;
  href: string;
  createdAt: string;
}

export default async function DashboardPage() {
  const { profile, subscription } = await requireOnboardedUser();
  const supabase = await createClient();
  const ownerId = resolveCreditOwnerId(profile);

  const [{ data: credits }, { data: limits }, { data: art }, { data: posts }, { data: notes }, { data: chats }] =
    await Promise.all([
      supabase.from("credits_balance").select("*").eq("owner_id", ownerId).maybeSingle(),
      supabase.from("plan_limits").select("*").eq("plan_code", subscription!.plan_code).single(),
      supabase
        .from("bible_art_generations")
        .select("id, verse_reference, theme, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("social_post_generations")
        .select("id, caption_text, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("devotional_notes")
        .select("id, note, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("spiritual_chat_conversations")
        .select("id, title, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const activity: ActivityItem[] = [
    ...(art ?? []).map((a) => ({
      id: a.id,
      type: "art" as const,
      label: `Generated art: ${a.verse_reference ?? a.theme ?? "untitled"}`,
      href: "/art/gallery",
      createdAt: a.created_at,
    })),
    ...(posts ?? []).map((p) => ({
      id: p.id,
      type: "post" as const,
      label: `Created post: ${(p.caption_text ?? "").slice(0, 40) || "untitled"}`,
      href: `/posts/${p.id}`,
      createdAt: p.created_at,
    })),
    ...(notes ?? []).map((n) => ({
      id: n.id,
      type: "devotional_note" as const,
      label: "Wrote a devotional note",
      href: "/devotionals/history",
      createdAt: n.created_at,
    })),
    ...(chats ?? []).map((c) => ({
      id: c.id,
      type: "chat" as const,
      label: c.title ?? "Spiritual chat conversation",
      href: "/chat",
      createdAt: c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="mb-8 flex items-center justify-between rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div>
          <PlanBadge planCode={subscription!.plan_code} status={subscription!.status} />
          <p className="mt-2 text-sm text-neutral-500">
            Renews {new Date(subscription!.current_period_end).toLocaleDateString()}
          </p>
        </div>
        <Link href="/billing" className="text-sm font-medium underline">
          Manage plan
        </Link>
      </div>

      {credits && limits && (
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <CreditMeter
            label="Image credits"
            remaining={credits.image_credits_remaining}
            total={limits.image_credits_per_cycle}
          />
          <CreditMeter
            label="Text credits"
            remaining={credits.text_credits_remaining}
            total={limits.text_credits_per_cycle}
          />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/art" label="New Art" />
        <QuickLink href="/posts" label="New Post" />
        <QuickLink href="/devotionals" label="Devotional" />
        <QuickLink href="/chat" label="Spiritual Chat" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Recent activity</h2>
      <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {activity.map((item) => (
          <li key={`${item.type}-${item.id}`} className="py-2 text-sm">
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
            <span className="ml-2 text-xs text-neutral-400">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
        {activity.length === 0 && <li className="py-2 text-sm text-neutral-500">No activity yet.</li>}
      </ul>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-neutral-200 px-3 py-2 text-center text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
    >
      {label}
    </Link>
  );
}
