import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, resolveCreditOwnerId } from "@/lib/auth/session";
import { failStaleArtJobs } from "@/lib/art/jobs";

// How far back a finished job still counts as "just finished" for the in-app notice.
const RECENT_MS = 10 * 60 * 1000;

/**
 * The person's image jobs that are still running, plus the ones that finished in
 * the last few minutes. Polled by the art page and the in-app notifier.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  await failStaleArtJobs(user.id, resolveCreditOwnerId(profile));

  const since = new Date(Date.now() - RECENT_MS).toISOString();
  const { data } = await supabase
    .from("bible_art_generations")
    .select("id, status, image_url, verse_reference, theme, created_at")
    .eq("user_id", user.id)
    .or(`status.eq.pending,created_at.gte.${since}`)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ jobs: data ?? [] });
}
