import { createAdminClient } from "@/lib/supabase/admin";
import { generateDevotional } from "@/lib/openai/text";
import type { Devotional } from "@/lib/types/database.types";

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

  const generated = await generateDevotional({ date: today });

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
