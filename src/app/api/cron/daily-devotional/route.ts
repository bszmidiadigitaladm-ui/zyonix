import { NextResponse } from "next/server";
import { ensureTodaysDevotional } from "@/lib/devotional/generate";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // TEMPORARY diagnostic: presence/length only, never values, to debug why
  // SUPABASE_SERVICE_ROLE_KEY isn't reaching this function in production.
  // Gated behind the same CRON_SECRET check above. Remove once resolved.
  if (new URL(request.url).searchParams.get("debug") === "1") {
    return NextResponse.json({
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasCronSecret: Boolean(process.env.CRON_SECRET),
      hasOpenaiKey: Boolean(process.env.OPENAI_API_KEY),
      hasRunwayKey: Boolean(process.env.RUNWAY_API_KEY),
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      hasHotmartHottok: Boolean(process.env.HOTMART_HOTTOK),
      hasResendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL),
      checkedAfter: "delete+recreate all four with explicit scopes",
    });
  }

  try {
    const devotional = await ensureTodaysDevotional();
    return NextResponse.json({ devotional });
  } catch (err) {
    console.error("daily-devotional cron failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
