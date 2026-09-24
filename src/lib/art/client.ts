// Browser-side helpers for background Bible-art jobs.

export const ART_JOB_STARTED_EVENT = "zyonix:art-job-started";

export interface ArtJobStatus {
  id: string;
  status: "pending" | "completed" | "failed";
  image_url: string | null;
  verse_reference: string | null;
  theme: string | null;
  created_at: string;
}

/** The person's running and recently finished jobs, or null if the request failed. */
export async function fetchArtJobs(): Promise<ArtJobStatus[] | null> {
  try {
    const res = await fetch("/api/ai/art/jobs", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { jobs: ArtJobStatus[] };
    return data.jobs;
  } catch {
    return null;
  }
}
