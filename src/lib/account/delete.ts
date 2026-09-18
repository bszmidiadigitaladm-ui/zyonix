import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

const BUCKET = "generations";

type AdminClient = SupabaseClient<Database>;

export type DeleteAccountResult = { ok: true } | { ok: false; error: "team_has_members" | "delete_failed" };

/** Removes every file under `<userId>/` in the generations bucket (art, posts, videos, flyers). */
async function deleteStoredFiles(admin: AdminClient, userId: string) {
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

/**
 * Permanent account erasure (LGPD art. 18 VI). Deleting the auth user cascades
 * to the profile, generations, journals, chat, progress, subscription and every
 * other user_id-scoped table; storage objects don't cascade, so they're
 * removed afterwards. Shared by the self-service route and the admin panel so
 * both erase exactly the same things.
 */
export async function deleteAccountCompletely(
  admin: AdminClient,
  target: { id: string; email: string | null | undefined },
): Promise<DeleteAccountResult> {
  // A team owner's deletion would cascade-delete the whole workspace out from
  // under the other members, so make that an explicit, separate step.
  const { data: profile } = await admin
    .from("profiles")
    .select("team_id, team_role")
    .eq("id", target.id)
    .maybeSingle();

  if (profile?.team_id && profile.team_role === "owner") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("team_id", profile.team_id)
      .neq("id", target.id);
    if ((count ?? 0) > 0) return { ok: false, error: "team_has_members" };
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
    if (target.email) {
      await admin.from("pending_activations").delete().eq("email", target.email);
    }

    const { error } = await admin.auth.admin.deleteUser(target.id);
    if (error) throw error;
  } catch (err) {
    console.error("Account deletion failed", err);
    return { ok: false, error: "delete_failed" };
  }

  // The account is gone at this point, so a storage hiccup must not report
  // failure — it's logged so the leftover files can be swept.
  try {
    await deleteStoredFiles(admin, target.id);
  } catch (err) {
    console.error("Account deleted but stored files could not be removed", { userId: target.id, err });
  }

  return { ok: true };
}
