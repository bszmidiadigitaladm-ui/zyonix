import { createAdminClient } from "@/lib/supabase/admin";
import { refundCredit } from "@/lib/credits/consume";

// Same rules as Bible art jobs (src/lib/art/jobs.ts), for poster_generations.

// Poster edits take longer than art, so a job is only treated as lost after this.
export const STALE_POSTER_MS = 5 * 60 * 1000;
export const MAX_PENDING_POSTERS = 3;

/** Fails a still-pending job and refunds its credit, exactly once. */
export async function failPosterJob(jobId: string, creditOwnerId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("poster_generations")
    .update({ status: "failed" })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id");

  if (!data || data.length === 0) return false;
  await refundCredit(creditOwnerId, "image", 1);
  return true;
}

export async function failStalePosterJobs(userId: string, creditOwnerId: string): Promise<void> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_POSTER_MS).toISOString();
  const { data: stale } = await admin
    .from("poster_generations")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("created_at", cutoff);

  for (const job of stale ?? []) {
    await failPosterJob(job.id, creditOwnerId);
  }
}
