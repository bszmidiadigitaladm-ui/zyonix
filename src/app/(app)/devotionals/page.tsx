import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sunrise } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";
import { PageHeader } from "@/components/ui/PageHeader";
import { DevotionalCard } from "@/components/devotional/DevotionalCard";
import { NoteEditor } from "@/components/devotional/NoteEditor";

export default async function DevotionalPage() {
  const { user } = await requireOnboardedUser();
  const t = await getTranslations("devotionals");
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
      <PageHeader
        icon={Sunrise}
        title={t("today")}
        actions={
          <Link href="/devotionals/history" className="text-sm font-medium text-accent hover:underline">
            {t("history")}
          </Link>
        }
      />
      <DevotionalCard devotional={devotional} />
      <NoteEditor devotionalId={devotional.id} initialNote={existingNote?.note ?? ""} />
    </div>
  );
}
