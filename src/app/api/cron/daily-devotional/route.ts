import { NextResponse } from "next/server";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // TEMPORARY diagnostic: names only, never values, to debug why
  // SUPABASE_SERVICE_ROLE_KEY isn't reaching this function in production.
  console.log(
    "env keys containing SUPABASE:",
    Object.keys(process.env).filter((k) => k.includes("SUPABASE")).join(", "),
  );
  console.log(
    "env keys containing CRON:",
    Object.keys(process.env).filter((k) => k.includes("CRON")).join(", "),
  );

  try {
    const devotional = await ensureTodaysDevotional();
    return NextResponse.json({ devotional });
  } catch (err) {
    console.error("daily-devotional cron failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
