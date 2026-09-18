import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitResponse } from "@/lib/rate-limit";
import { deleteAccountCompletely } from "@/lib/account/delete";

const bodySchema = z.object({ confirm_email: z.string().trim().min(1) });

// Self-service account erasure (LGPD/GDPR). Requires typing the account email
// as a deliberate confirmation; the erasure itself lives in lib/account/delete.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`account:delete:${user.id}`, 5, 3600);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.confirm_email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  const admin = createAdminClient();

  // An administrator can't erase their own admin account from here; remove the
  // admin_users row first (SQL) so access is never lost by accident.
  const { data: isAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (isAdmin) {
    return NextResponse.json({ error: "admin_account" }, { status: 409 });
  }

  const result = await deleteAccountCompletely(admin, { id: user.id, email: user.email });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "team_has_members" ? 409 : 500 });
  }

  // Clear the session cookies; the user row is already gone.
  await supabase.auth.signOut().catch(() => undefined);

  return NextResponse.json({ deleted: true });
}
