import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkBibleBadges } from "@/lib/badges/award";

const bodySchema = z.object({
  book: z.string().min(1),
  chapter: z.number().int().min(1),
  plan_id: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { book, chapter, plan_id } = parsed.data;

  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: user.id,
      book_code: book,
      chapter,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_code,chapter" },
  );

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await checkBibleBadges(user.id);

  // If this reading was part of an active plan's current day, and every
  // reading for that day is now complete, advance the plan to the next day.
  if (plan_id) {
    const { data: userPlan } = await supabase
      .from("user_reading_plans")
      .select("current_day")
      .eq("user_id", user.id)
      .eq("plan_id", plan_id)
      .maybeSingle();

    if (userPlan) {
      const { data: day } = await supabase
        .from("reading_plan_days")
        .select("readings")
        .eq("plan_id", plan_id)
        .eq("day_number", userPlan.current_day)
        .maybeSingle();

      const readings = (day?.readings as { book: string; chapter: number }[] | undefined) ?? [];
      const isTodaysReading = readings.some((r) => r.book === book && r.chapter === chapter);

      if (isTodaysReading) {
        const { data: completed } = await supabase
          .from("reading_progress")
          .select("book_code, chapter")
          .eq("user_id", user.id)
          .in(
            "book_code",
            readings.map((r) => r.book),
          );

        const completedSet = new Set((completed ?? []).map((c) => `${c.book_code}:${c.chapter}`));
        const allDone = readings.every((r) => completedSet.has(`${r.book}:${r.chapter}`));

        if (allDone) {
          await supabase
            .from("user_reading_plans")
            .update({ current_day: userPlan.current_day + 1 })
            .eq("user_id", user.id)
            .eq("plan_id", plan_id);
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
