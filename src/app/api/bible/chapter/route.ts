import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getChapter } from "@/lib/bible/cache";
import { getBookMeta } from "@/lib/bible/books";
import { rateLimitResponse } from "@/lib/rate-limit";

const querySchema = z.object({
  translation: z.enum(["web", "kjv", "rva1909"]),
  book: z.string().min(1),
  chapter: z.coerce.number().int().min(1),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`bible:chapter:${user.id}`, 120, 60);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    translation: searchParams.get("translation"),
    book: searchParams.get("book"),
    chapter: searchParams.get("chapter"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { translation, book, chapter } = parsed.data;

  const meta = getBookMeta(book);
  if (!meta || chapter > meta.chapterCount) {
    return NextResponse.json({ error: "invalid_reference" }, { status: 400 });
  }

  try {
    const verses = await getChapter(translation, book, chapter);
    return NextResponse.json({ book, chapter, translation, verses });
  } catch (err) {
    console.error("Bible chapter fetch failed", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
