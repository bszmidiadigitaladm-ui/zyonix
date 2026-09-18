import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  book: z.string().min(1),
  chapter: z.number().int().min(1),
  verse: z.number().int().min(1).nullable().optional(),
});

// Toggles a favorite: inserts if it doesn't exist, deletes if it does.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`bible:favorite:${user.id}`, 120, 3600);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { book, chapter, verse } = parsed.data;

  let existingQuery = supabase
    .from("bible_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_code", book)
    .eq("chapter", chapter);
  existingQuery = verse == null ? existingQuery.is("verse", null) : existingQuery.eq("verse", verse);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    await supabase.from("bible_favorites").delete().eq("id", existing.id);
    return NextResponse.json({ favorited: false });
  }

  const { error } = await supabase.from("bible_favorites").insert({
    user_id: user.id,
    book_code: book,
    chapter,
    verse: verse ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ favorited: true });
}
