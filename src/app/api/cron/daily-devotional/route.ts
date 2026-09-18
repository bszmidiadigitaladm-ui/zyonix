import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const devotional = await ensureTodaysDevotional();
    return NextResponse.json({ devotional });
  } catch (err) {
    console.error("daily-devotional cron failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
