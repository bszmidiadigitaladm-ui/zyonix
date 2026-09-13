import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_COUNT = 10;
const MAX_COUNT = 25;

// quiz_questions has no select policy for authenticated users (see
// 0022_quiz_schema.sql) — only the service-role admin client can read it, so
// correct_index never reaches the browser. This route strips it before
// returning the questions to the client.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("count"));
  const count = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), MAX_COUNT) : DEFAULT_COUNT;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_random_quiz_questions", { p_count: count });

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const questions = (data ?? []).map((q) => ({
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
  }));

  return NextResponse.json({ questions });
}
