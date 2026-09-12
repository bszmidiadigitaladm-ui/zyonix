import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DevotionalCard } from "@/components/devotional/DevotionalCard";

export default async function DevotionalHistoryPage() {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data: devotionals } = await supabase
    .from("devotionals")
    .select("*")
    .order("publish_date", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Devotional History</h1>
        <Link href="/devotionals" className="text-sm font-medium underline">
          Today
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {(devotionals ?? []).map((d) => (
          <DevotionalCard key={d.id} devotional={d} />
        ))}
        {devotionals?.length === 0 && (
          <p className="text-sm text-neutral-500">No devotionals yet.</p>
        )}
      </div>
    </div>
  );
}
