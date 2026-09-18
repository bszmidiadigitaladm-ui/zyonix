import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { awardBadge } from "@/lib/badges/award";
import { rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  devotional_id: z.string().uuid(),
  note: z.string().trim().max(4000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`devotional:note:${user.id}`, 60, 3600);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { devotional_id, note } = parsed.data;

  const { data, error } = await supabase
    .from("devotional_notes")
    .upsert(
      { user_id: user.id, devotional_id, note },
      { onConflict: "user_id,devotional_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await awardBadge(user.id, "first_devotional_note");

  return NextResponse.json({ note: data });
}
