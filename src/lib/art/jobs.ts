import { createAdminClient } from "@/lib/supabase/admin";
import { refundCredit } from "@/lib/credits/consume";

// A background job that has not finished after this long is treated as lost (the
// serverless function was stopped before it could record a result).
export const STALE_JOB_MS = 4 * 60 * 1000;

/** People can have this many images generating at once. */
export const MAX_PENDING_JOBS = 3;

/**
 * Marks a still-pending job as failed and refunds its credit. The status flip is
 * conditional, so a job that finished a moment earlier is left alone and a credit
 * is never refunded twice. Returns whether this call was the one that failed it.
 */
export async function failArtJob(jobId: string, creditOwnerId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bible_art_generations")
    .update({ status: "failed" })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id");

  if (!data || data.length === 0) return false;
  await refundCredit(creditOwnerId, "image", 1);
  return true;
}

/** Fails and refunds this person's jobs that have been pending for too long. */
export async function failStaleArtJobs(userId: string, creditOwnerId: string): Promise<void> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_JOB_MS).toISOString();
  const { data: stale } = await admin
    .from("bible_art_generations")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("created_at", cutoff);

  for (const job of stale ?? []) {
    await failArtJob(job.id, creditOwnerId);
  }
}
