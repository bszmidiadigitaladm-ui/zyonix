import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ArtGalleryGrid } from "@/components/art/ArtGalleryGrid";

export default async function ArtGalleryPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const query = supabase
    .from("bible_art_generations")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: generations } = profile.team_id
    ? await query.or(`user_id.eq.${profile.id},team_id.eq.${profile.team_id}`)
    : await query.eq("user_id", profile.id);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Bible Art</h1>
        <Link href="/art" className="text-sm font-medium underline">
          New generation
        </Link>
      </div>
      <ArtGalleryGrid generations={generations ?? []} />
    </div>
  );
}
