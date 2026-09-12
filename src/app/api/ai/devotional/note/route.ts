import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ note: data });
}
