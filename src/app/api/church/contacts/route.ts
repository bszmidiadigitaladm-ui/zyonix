import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamOwnerId } from "@/lib/auth/session";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
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

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("church_contacts")
    .insert({ team_id: teamId, name: parsed.data.name, email: parsed.data.email })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "contact_exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}
