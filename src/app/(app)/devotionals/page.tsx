import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";
import { DevotionalCard } from "@/components/devotional/DevotionalCard";
import { NoteEditor } from "@/components/devotional/NoteEditor";

export default async function DevotionalPage() {
  const { user } = await requireOnboardedUser();
  const devotional = await ensureTodaysDevotional();

  const supabase = await createClient();
  const { data: existingNote } = await supabase
    .from("devotional_notes")
    .select("note")
    .eq("user_id", user.id)
    .eq("devotional_id", devotional.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Today&apos;s Devotional</h1>
        <Link href="/devotionals/history" className="text-sm font-medium underline">
          History
        </Link>
      </div>
      <DevotionalCard devotional={devotional} />
      <NoteEditor devotionalId={devotional.id} initialNote={existingNote?.note ?? ""} />
    </div>
  );
}
