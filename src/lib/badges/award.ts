import { createAdminClient } from "@/lib/supabase/admin";
import { computeStreak } from "@/lib/bible/streak";
import { BIBLE_BOOKS } from "@/lib/bible/books";

/**
 * Idempotently awards a badge. Safe to call unconditionally on every
 * qualifying success — the unique(user_id, badge_code) constraint plus
 * ignoreDuplicates means a repeat call is a cheap no-op, not an error.
 */
export async function awardBadge(userId: string, code: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("user_badges")
    .upsert({ user_id: userId, badge_code: code }, { onConflict: "user_id,badge_code", ignoreDuplicates: true });
}

/**
 * Checks the threshold-based Bible badges (streak/count/book-complete) after
 * a reading_progress write. Reuses BIBLE_BOOKS (src/lib/bible/books.ts) and
 * computeStreak (src/lib/bible/streak.ts) — the same logic the progress page
 * already renders — so the numbers can never drift apart.
 */
export async function checkBibleBadges(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: progress } = await admin
    .from("reading_progress")
    .select("book_code, chapter, completed_at")
    .eq("user_id", userId);

  const rows = progress ?? [];
  if (rows.length === 0) return;

  const streak = computeStreak(rows.map((r) => r.completed_at));
  if (streak >= 7) await awardBadge(userId, "streak_7");
  if (streak >= 30) await awardBadge(userId, "streak_30");
  if (rows.length >= 10) await awardBadge(userId, "ten_chapters_read");

  const readByBook = new Map<string, Set<number>>();
  for (const r of rows) {
    if (!readByBook.has(r.book_code)) readByBook.set(r.book_code, new Set());
    readByBook.get(r.book_code)!.add(r.chapter);
  }

  const anyBookComplete = BIBLE_BOOKS.some(
    (b) => (readByBook.get(b.code)?.size ?? 0) >= b.chapterCount,
  );
  if (anyBookComplete) await awardBadge(userId, "book_complete");
}
