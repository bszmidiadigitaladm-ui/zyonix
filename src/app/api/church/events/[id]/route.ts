import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeamOwnerId } from "@/lib/auth/session";

export async function DELETE(_request: Request, { params }: RouteContext<"/api/church/events/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const teamId = await requireTeamOwnerId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "not_team_owner" }, { status: 403 });
  }

  const { error } = await supabase.from("church_events").delete().eq("id", id).eq("team_id", teamId);

  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
