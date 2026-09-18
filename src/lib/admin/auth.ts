import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitResponse } from "@/lib/rate-limit";

export interface AdminContext {
  userId: string;
  email: string;
  /** aal2 = the person completed the TOTP second factor in this session. */
  aal: "aal1" | "aal2";
  /** Whether a second factor is already enrolled (decides enroll vs. verify on /admin/mfa). */
  hasFactor: boolean;
}

/**
 * Resolves the signed-in administrator, or null for everyone else.
 *
 * getUser() validates the session with the Auth server (the cookie alone isn't
 * trusted); membership is then read from admin_users with the service role,
 * because that table has no client-facing policy at all. Any error (including
 * "table doesn't exist yet") resolves to "not an admin" — fail closed.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !data) return null;

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return {
    userId: user.id,
    email: user.email ?? "",
    aal: assurance?.currentLevel === "aal2" ? "aal2" : "aal1",
    hasFactor: assurance?.nextLevel === "aal2",
  };
}

/**
 * Guard for every admin page. Layouts don't re-run on client-side navigation,
 * so each page calls this itself instead of trusting the layout.
 * Non-admins get a plain 404 so the panel's existence isn't advertised.
 */
export async function requireAdminPage(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) notFound();
  if (ctx.aal !== "aal2") redirect("/admin/mfa");
  return ctx;
}

/** Guard for /admin/mfa itself: must be an admin, but the second factor isn't required yet. */
export async function requireAdminForMfa(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) notFound();
  return ctx;
}

/** Guard for every /api/admin route: admin + second factor + rate limit. */
export async function requireAdminApi(): Promise<{ ctx: AdminContext } | { response: NextResponse }> {
  const ctx = await getAdminContext();
  if (!ctx) return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (ctx.aal !== "aal2") return { response: NextResponse.json({ error: "mfa_required" }, { status: 403 }) };

  const limited = await rateLimitResponse(`admin:${ctx.userId}`, 120, 60);
  if (limited) return { response: limited };

  return { ctx };
}
