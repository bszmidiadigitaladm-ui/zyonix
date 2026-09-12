import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (!profile?.team_id) {
    return NextResponse.json({ members: [] });
  }

  // profiles' RLS only allows selecting your own row (by design — see
  // 0015_rls_policies.sql), so listing teammates needs the admin client here,
  // gated on the caller's own team_id we just verified above.
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("profiles")
    .select("id, email, full_name, team_role")
    .eq("team_id", profile.team_id);

  return NextResponse.json({ members: members ?? [] });
}

const deleteSchema = z.object({ member_id: z.string().uuid() });

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id, team_role")
    .eq("id", user.id)
    .single();

  if (!profile?.team_id || profile.team_role !== "owner") {
    return NextResponse.json({ error: "not_team_owner" }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (parsed.data.member_id === user.id) {
    return NextResponse.json({ error: "cannot_remove_owner" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ team_id: null, team_role: null })
    .eq("id", parsed.data.member_id)
    .eq("team_id", profile.team_id);

  if (error) {
    return NextResponse.json({ error: "remove_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
