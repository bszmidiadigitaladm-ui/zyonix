import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamOwnerId } from "@/lib/auth/session";

const bodySchema = z.object({
  type: z.enum(["income", "expense"]),
  amount_usd: z.number().positive().max(1_000_000),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    .from("financial_transactions")
    .insert({ team_id: teamId, created_by: user.id, ...parsed.data })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ transaction: data });
}
