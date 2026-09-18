import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { buildAccountExport, exportFilename } from "@/lib/account/export";

// Data-portability export (LGPD/GDPR) for the signed-in user. Runs on the
// user's own Supabase client, so RLS is a second lock behind the explicit
// user-id filters inside buildAccountExport.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`account:export:${user.id}`, 5, 3600);
  if (limited) return limited;

  const payload = await buildAccountExport(supabase, user);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
