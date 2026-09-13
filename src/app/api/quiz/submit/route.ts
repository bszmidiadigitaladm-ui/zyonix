import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/session";

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        selected_index: z.number().int().min(0).max(3),
      }),
    )
    .min(1)
    .max(25),
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
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { answers } = parsed.data;

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Never trust a client-supplied score: re-fetch the correct answers by id
  // and grade server-side.
  const { data: questions, error: fetchError } = await admin
    .from("quiz_questions")
    .select("id, correct_index")
    .in(
      "id",
      answers.map((a) => a.question_id),
    );

  if (fetchError) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const correctById = new Map((questions ?? []).map((q) => [q.id, q.correct_index]));
  const score = answers.reduce(
    (total, a) => (correctById.get(a.question_id) === a.selected_index ? total + 1 : total),
    0,
  );

  const displayName = profile.full_name ?? profile.email;

  const { data: session, error: insertError } = await admin
    .from("quiz_sessions")
    .insert({
      user_id: user.id,
      score,
      total_questions: answers.length,
      display_name: displayName,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ session });
}
