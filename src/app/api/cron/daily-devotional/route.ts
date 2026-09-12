import { NextResponse } from "next/server";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const devotional = await ensureTodaysDevotional();
  return NextResponse.json({ devotional });
}
