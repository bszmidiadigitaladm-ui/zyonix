import { createAdminClient } from "@/lib/supabase/admin";
import { generateDevotional } from "@/lib/openai/text";
import { devotionalThemeFor } from "@/lib/devotional/themes";
import type { Devotional } from "@/lib/types/database.types";

// How many past devotionals the model is told not to repeat.
const RECENT_COUNT = 30;

const normalize = (text: string | null | undefined) =>
  (text ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function repeatsRecent(
  generated: { title: string; scriptureReference: string },
  recent: { title: string; scripture_reference: string | null }[],
): boolean {
  const title = normalize(generated.title);
  const reference = normalize(generated.scriptureReference);
  return recent.some((past) => normalize(past.title) === title || (reference && normalize(past.scripture_reference) === reference));
}

/**
 * Returns today's devotional, generating and caching it on first request.
 * Called both by the daily cron job (src/app/api/cron/daily-devotional) and,
 * as a lazy fallback, by the devotionals page — so the feature still works
 * in local dev or if the external scheduler hasn't fired yet today.
 */
export async function ensureTodaysDevotional(): Promise<Devotional> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("devotionals")
    .select("*")
    .eq("publish_date", today)
    .maybeSingle();

  if (existing) return existing;

  // Tell the model what already ran and give it a theme of the day. If it repeats a recent
  // title or verse anyway, ask once more with that attempt added to the "do not reuse" list.
  const { data: recentRows } = await supabase
    .from("devotionals")
    .select("title, scripture_reference")
    .lt("publish_date", today)
    .order("publish_date", { ascending: false })
    .limit(RECENT_COUNT);
  const recent = recentRows ?? [];
  const avoid = recent.map((past) => (past.scripture_reference ? `${past.title} (${past.scripture_reference})` : past.title));
  const theme = devotionalThemeFor(today);

  let generated = await generateDevotional({ date: today, theme, avoid });
  if (repeatsRecent(generated, recent)) {
    generated = await generateDevotional({
      date: today,
      theme,
      avoid: [...avoid, `${generated.title} (${generated.scriptureReference})`],
    });
  }

  const { data: inserted, error } = await supabase
    .from("devotionals")
    .insert({
      publish_date: today,
      title: generated.title,
      body: generated.body,
      scripture_reference: generated.scriptureReference,
    })
    .select()
    .single();

  if (error) {
    // Another request (or the cron job) may have inserted it in the meantime.
    const { data: raceWinner } = await supabase
      .from("devotionals")
      .select("*")
      .eq("publish_date", today)
      .single();
    if (raceWinner) return raceWinner;
    throw error;
  }

  return inserted;
}
