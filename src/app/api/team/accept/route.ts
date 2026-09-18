import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPast } from "@/lib/utils";
import { rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`team:accept:${user.id}`, 10, 3600);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("team_invites")
    .select("*")
    .eq("token", parsed.data.token)
    .eq("status", "pending")
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }

  if (isPast(invite.expires_at)) {
    return NextResponse.json({ error: "invite_expired" }, { status: 410 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ team_id: invite.team_id, team_role: "member" })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: "accept_failed" }, { status: 500 });
  }

  await admin.from("team_invites").update({ status: "accepted" }).eq("id", invite.id);

  return NextResponse.json({ success: true });
}
