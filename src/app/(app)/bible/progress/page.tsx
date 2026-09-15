import { getTranslations } from "next-intl/server";
import { BookOpen, Flame, BookMarked, Star } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { BibleTabNav } from "@/components/bible/BibleTabNav";
import { Card } from "@/components/ui/Card";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { computeStreak } from "@/lib/bible/streak";

export default async function BibleProgressPage() {
  const { user } = await requireOnboardedUser();
  const t = await getTranslations("bible");
  const supabase = await createClient();

  const [{ data: progress }, { count: favorites }] = await Promise.all([
    supabase.from("reading_progress").select("book_code, chapter, completed_at").eq("user_id", user.id),
    supabase.from("bible_favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const rows = progress ?? [];
  const streak = computeStreak(rows.map((r) => r.completed_at));

  const readByBook = new Map<string, Set<number>>();
  for (const r of rows) {
    if (!readByBook.has(r.book_code)) readByBook.set(r.book_code, new Set());
    readByBook.get(r.book_code)!.add(r.chapter);
  }

  const booksCompleted = BIBLE_BOOKS.filter(
    (b) => (readByBook.get(b.code)?.size ?? 0) >= b.chapterCount,
  ).length;

  const totalChapters = BIBLE_BOOKS.reduce((s, b) => s + b.chapterCount, 0);
  const otTotal = BIBLE_BOOKS.filter((b) => b.testament === "ot").reduce((s, b) => s + b.chapterCount, 0);
  const ntTotal = BIBLE_BOOKS.filter((b) => b.testament === "nt").reduce((s, b) => s + b.chapterCount, 0);
  const otRead = BIBLE_BOOKS.filter((b) => b.testament === "ot").reduce(
    (s, b) => s + (readByBook.get(b.code)?.size ?? 0),
    0,
  );
  const ntRead = BIBLE_BOOKS.filter((b) => b.testament === "nt").reduce(
    (s, b) => s + (readByBook.get(b.code)?.size ?? 0),
    0,
  );

  const overallPct = totalChapters > 0 ? Math.round((rows.length / totalChapters) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon={BookOpen} title={t("hubTitle")} subtitle={t("hubSubtitle")} />
      <BibleTabNav />
      <h2 className="mb-1 text-lg font-semibold">{t("progressTitle")}</h2>
      <p className="mb-6 text-sm text-muted">{t("progressSubtitle")}</p>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatCard
          icon={Flame}
          value={
            <>
              {streak} <span className="text-sm font-normal text-muted">{t("days")}</span>
            </>
          }
          label={t("streak")}
        />
        <StatCard icon={BookOpen} value={rows.length} label={t("chaptersRead")} />
        <StatCard icon={BookMarked} value={booksCompleted} label={t("booksCompleted")} />
        <StatCard icon={Star} value={favorites ?? 0} label={t("favoritesCount")} />
      </div>

      <Card className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium">{t("overallProgress")}</span>
          <span className="text-accent">{overallPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full rounded-full bg-accent" style={{ width: `${overallPct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {t("chaptersOutOf", { read: rows.length, total: totalChapters })}
        </p>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">{t("byTestament")}</p>
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{t("oldTestament")}</span>
            <span>{Math.round((otRead / otTotal) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(otRead / otTotal) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{t("newTestament")}</span>
            <span>{Math.round((ntRead / ntTotal) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(ntRead / ntTotal) * 100}%` }} />
          </div>
        </div>
      </Card>
    </div>
  );
}
