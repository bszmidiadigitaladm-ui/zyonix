import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitResponse } from "@/lib/rate-limit";

const BUCKET = "generations";

const bodySchema = z.object({ confirm_email: z.string().trim().min(1) });

/** Removes every file under `<userId>/` in the generations bucket (art, posts, videos, flyers). */
async function deleteStoredFiles(admin: ReturnType<typeof createAdminClient>, userId: string) {
  // Each pass removes what it lists, so re-listing from the start terminates.
  for (let pass = 0; pass < 50; pass++) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(userId, { limit: 1000 });
    if (error) throw error;
    if (!files || files.length === 0) return;
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) throw removeError;
  }
}

// Self-service account erasure (LGPD/GDPR). Deleting the auth user cascades
// to the profile, generations, journals, chat, progress, subscription and every
// other user_id-scoped table; storage objects don't cascade, so they're
// removed afterwards. Requires typing the account email as a deliberate confirmation.
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

  // A team owner's deletion would cascade-delete the whole workspace out from
  // under the other members, so make that an explicit, separate step.
  const { data: profile } = await admin
    .from("profiles")
    .select("team_id, team_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.team_id && profile.team_role === "owner") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("team_id", profile.team_id)
      .neq("id", user.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "team_has_members" }, { status: 409 });
    }
  }

  try {
    // These three reference auth.users without ON DELETE CASCADE (their team
    // owns them, not the user). Postgres checks that kind of FK before the
    // team cascade has removed them, so the user delete would fail — clear them
    // first. Only reached by a team owner with no other members.
    if (profile?.team_id && profile.team_role === "owner") {
      await admin.from("communications").delete().eq("team_id", profile.team_id);
      await admin.from("financial_transactions").delete().eq("team_id", profile.team_id);
      await admin.from("team_invites").delete().eq("team_id", profile.team_id);
    }

    // A purchase made under this email before signup is keyed by email, not user id.
    if (user.email) {
      await admin.from("pending_activations").delete().eq("email", user.email);
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    console.error("Account deletion failed", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  // The account is gone at this point, so a storage hiccup must not report
  // failure to the user — it's logged so the leftover files can be swept.
  try {
    await deleteStoredFiles(admin, user.id);
  } catch (err) {
    console.error("Account deleted but stored files could not be removed", { userId: user.id, err });
  }

  // Clear the session cookies; the user row is already gone.
  await supabase.auth.signOut().catch(() => undefined);

  return NextResponse.json({ deleted: true });
}
