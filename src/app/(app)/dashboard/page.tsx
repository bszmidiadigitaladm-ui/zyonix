import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Palette,
  Layers,
  Sunrise,
  MessageCircle,
  BookOpen,
  Mic,
  Clapperboard,
  Gamepad2,
  Award,
  type LucideIcon,
} from "lucide-react";
import { requireOnboardedUser, resolveCreditOwnerId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { CreditMeter } from "@/components/billing/CreditMeter";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { EmptyState } from "@/components/ui/EmptyState";

interface ActivityItem {
  id: string;
  type: "art" | "post" | "devotional_note" | "chat";
  label: string;
  href: string;
  createdAt: string;
}

const ACTIVITY_ICON: Record<ActivityItem["type"], LucideIcon> = {
  art: Palette,
  post: Layers,
  devotional_note: Sunrise,
  chat: MessageCircle,
};

export default async function DashboardPage() {
  const { profile, subscription } = await requireOnboardedUser();
  const t = await getTranslations("dashboard");
  const tNav = await getTranslations("nav");
  const supabase = await createClient();
  const ownerId = resolveCreditOwnerId(profile);

  const [
    { data: credits },
    { data: limits },
    { data: art },
    { data: posts },
    { data: notes },
    { data: chats },
    { count: badgesEarned },
    { count: badgesTotal },
  ] = await Promise.all([
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
    supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("badges").select("code", { count: "exact", head: true }),
  ]);

  const activity: ActivityItem[] = [
    ...(art ?? []).map((a) => ({
      id: a.id,
      type: "art" as const,
      label: t("generatedArt", { label: a.verse_reference ?? a.theme ?? t("untitled") }),
      href: "/art/gallery",
      createdAt: a.created_at,
    })),
    ...(posts ?? []).map((p) => ({
      id: p.id,
      type: "post" as const,
      label: t("createdPost", { label: (p.caption_text ?? "").slice(0, 40) || t("untitled") }),
      href: `/posts/${p.id}`,
      createdAt: p.created_at,
    })),
    ...(notes ?? []).map((n) => ({
      id: n.id,
      type: "devotional_note" as const,
      label: t("wroteNote"),
      href: "/devotionals/history",
      createdAt: n.created_at,
    })),
    ...(chats ?? []).map((c) => ({
      id: c.id,
      type: "chat" as const,
      label: c.title ?? t("chatConversation"),
      href: "/chat",
      createdAt: c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";
  const displayName = profile.full_name?.split(" ")[0] ?? profile.email.split("@")[0];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">
        {t(greetingKey, { name: displayName })} <span aria-hidden>👋</span>
      </h1>
      <p className="mb-6 text-sm text-muted">{t("greetingSubtitle")}</p>

      <Card className="mb-8 flex items-center justify-between">
        <div>
          <PlanBadge planCode={subscription!.plan_code} status={subscription!.status} />
          <p className="mt-2 text-sm text-muted">
            {t("renews", { date: new Date(subscription!.current_period_end).toLocaleDateString() })}
          </p>
        </div>
        <Link href="/billing" className="text-sm font-medium text-accent hover:underline">
          {t("managePlan")}
        </Link>
      </Card>

      {credits && limits && (
        <Card className="mb-8 flex flex-col gap-4">
          <CreditMeter
            label={t("imageCredits")}
            remaining={credits.image_credits_remaining}
            total={limits.image_credits_per_cycle}
          />
          <CreditMeter
            label={t("textCredits")}
            remaining={credits.text_credits_remaining}
            total={limits.text_credits_per_cycle}
          />
        </Card>
      )}

      {badgesTotal ? (
        <Link href="/badges">
          <Card className="mb-8 flex items-center gap-4 transition hover:border-accent/40">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Award size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t("badgesTeaser")}</p>
              <p className="text-xs text-muted">
                {t("badgesEarnedCount", { earned: badgesEarned ?? 0, total: badgesTotal })}
              </p>
            </div>
          </Card>
        </Link>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("quickTools")}</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <IconTile href="/bible" icon={BookOpen} label={tNav("bible")} />
        <IconTile href="/art" icon={Palette} label={t("newArt")} />
        <IconTile href="/posts" icon={Layers} label={t("newPost")} />
        <IconTile href="/message" icon={Mic} label={t("newMessage")} />
        <IconTile href="/video" icon={Clapperboard} label={t("newVideo")} />
        <IconTile href="/devotionals" icon={Sunrise} label={t("devotional")} />
        <IconTile href="/chat" icon={MessageCircle} label={t("spiritualChat")} />
        <IconTile href="/games" icon={Gamepad2} label={t("playQuiz")} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t("recentActivity")}</h2>
      {activity.length === 0 ? (
        <EmptyState icon={Layers} title={t("noActivity")} />
      ) : (
        <Card className="flex flex-col divide-y divide-border p-0">
          {activity.map((item) => {
            const Icon = ACTIVITY_ICON[item.type];
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-surface-raised/60"
              >
                <Icon size={16} className="shrink-0 text-accent" />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
