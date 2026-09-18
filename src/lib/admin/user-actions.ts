import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CODES } from "@/lib/config";
import { activateSubscriptionForProfile } from "@/lib/hotmart/activation";
import { deleteAccountCompletely } from "@/lib/account/delete";
import { logAdminAction } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/auth";

// Every action needs a written reason: it lands in the audit log and is what
// makes an access defensible under LGPD art. 6 (purpose, necessity, accountability).
const reason = z.string().trim().min(5, "Give a reason (at least 5 characters)").max(500);
const credits = z.number().int().min(-100000).max(100000);

export const userActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant_plan"), reason, plan_code: z.enum(PLAN_CODES), days: z.number().int().min(1).max(3650) }),
  z.object({ action: z.literal("extend_plan"), reason, days: z.number().int().min(1).max(3650) }),
  z.object({ action: z.literal("revoke_plan"), reason }),
  z.object({ action: z.literal("adjust_credits"), reason, image: credits, text: credits, video: credits }),
  z.object({ action: z.literal("reset_credits"), reason }),
  z.object({ action: z.literal("ban"), reason }),
  z.object({ action: z.literal("unban"), reason }),
  z.object({
    action: z.literal("update_profile"),
    reason,
    full_name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
  }),
  z.object({ action: z.literal("delete_account"), reason, confirm_email: z.string().trim().min(1) }),
]);

export type UserAction = z.infer<typeof userActionSchema>;

export type ActionResult = { ok: true; message: string } | { ok: false; error: string; status: number };

const fail = (error: string, status = 400): ActionResult => ({ ok: false, error, status });
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Runs one administrative action against one user. Order matters: validate,
 * write the audit entry, only then change anything — so nothing an admin does
 * can happen without a record.
 */
export async function runUserAction(ctx: AdminContext, targetId: string, input: UserAction): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", targetId).maybeSingle();
  if (!profile) return fail("user_not_found", 404);

  const { data: targetAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", targetId).maybeSingle();
  const isAdminTarget = Boolean(targetAdmin);

  const audit = (details?: Record<string, string | number | boolean | null>) =>
    logAdminAction(ctx, {
      action: `user.${input.action}`,
      targetUserId: targetId,
      targetEmail: profile.email,
      reason: input.reason,
      details: details ?? null,
    });

  // Plan actions operate on the subscription that pays for the account: the
  // user's own, or the team's when they own one. Plain members have none.
  async function getSubscription() {
    const query = admin.from("subscriptions").select("*");
    const { data } = profile!.team_id
      ? await query.eq("team_id", profile!.team_id).maybeSingle()
      : await query.eq("owner_id", targetId).is("team_id", null).maybeSingle();
    return data;
  }
  const isPlainMember = Boolean(profile.team_id && profile.team_role !== "owner");
  const memberError = "Team member: manage the team owner's subscription instead";

  switch (input.action) {
    case "grant_plan": {
      if (isPlainMember) return fail(memberError);
      const existing = await getSubscription();
      if (existing?.hotmart_subscriber_code || existing?.hotmart_transaction_code) {
        return fail("This account has a paid Hotmart subscription. Use extend/credits instead of overwriting it.", 409);
      }
      const periodEnd = new Date(Date.now() + input.days * DAY_MS);
      await audit({ plan: input.plan_code, days: input.days });
      await activateSubscriptionForProfile(admin, {
        profile: { id: profile.id, email: profile.email, full_name: profile.full_name, team_id: profile.team_id },
        planCode: input.plan_code,
        isAnnual: false,
        grant: { periodEnd },
      });

      // Moving someone from a solo comp to a team plan creates a second subscription row
      // (solo and team subscriptions are separate). End any older complimentary one so it
      // doesn't linger as a second "active" plan and inflate the numbers.
      const { data: fresh } = await admin.from("profiles").select("team_id").eq("id", targetId).single();
      const { data: current } = fresh?.team_id
        ? await admin.from("subscriptions").select("id").eq("team_id", fresh.team_id).maybeSingle()
        : await admin.from("subscriptions").select("id").eq("owner_id", targetId).is("team_id", null).maybeSingle();
      if (current) {
        const nowIso = new Date().toISOString();
        await admin
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: nowIso, current_period_end: nowIso })
          .eq("owner_id", targetId)
          .eq("source", "admin_grant")
          .neq("id", current.id)
          .neq("status", "canceled");
      }
      return { ok: true, message: `Granted ${input.plan_code} until ${periodEnd.toLocaleDateString("en-GB")}` };
    }

    case "extend_plan": {
      if (isPlainMember) return fail(memberError);
      const sub = await getSubscription();
      if (!sub) return fail("No subscription to extend", 404);
      const base = Math.max(Date.now(), new Date(sub.current_period_end).getTime());
      const newEnd = new Date(base + input.days * DAY_MS);
      await audit({ days: input.days, previous_end: sub.current_period_end });
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: newEnd.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
        })
        .eq("id", sub.id);
      if (error) return fail("Could not extend the subscription", 500);
      return { ok: true, message: `Access extended to ${newEnd.toLocaleDateString("en-GB")}` };
    }

    case "revoke_plan": {
      if (isPlainMember) return fail(memberError);
      const sub = await getSubscription();
      if (!sub) return fail("No subscription to revoke", 404);
      await audit({ previous_status: sub.status });
      const nowIso = new Date().toISOString();
      const { error } = await admin
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: nowIso, current_period_end: nowIso, cancel_at_period_end: false })
        .eq("id", sub.id);
      if (error) return fail("Could not revoke the subscription", 500);
      const paid = Boolean(sub.hotmart_subscriber_code || sub.hotmart_transaction_code);
      return {
        ok: true,
        message: paid
          ? "Access revoked. Hotmart billing is NOT cancelled — cancel or refund it in Hotmart too."
          : "Access revoked.",
      };
    }

    case "adjust_credits": {
      const sub = await getSubscription();
      if (!sub) return fail("No subscription: credits belong to a subscription", 404);
      const { data: balance } = await admin.from("credits_balance").select("*").eq("subscription_id", sub.id).maybeSingle();
      if (!balance) return fail("No credit balance found for this subscription", 404);
      const next = {
        image_credits_remaining: Math.max(0, balance.image_credits_remaining + input.image),
        text_credits_remaining: Math.max(0, balance.text_credits_remaining + input.text),
        video_credits_remaining: Math.max(0, balance.video_credits_remaining + input.video),
      };
      await audit({ image: input.image, text: input.text, video: input.video });
      const { error } = await admin.from("credits_balance").update(next).eq("id", balance.id);
      if (error) return fail("Could not adjust credits", 500);
      return { ok: true, message: `Credits now: ${next.image_credits_remaining} image / ${next.text_credits_remaining} text / ${next.video_credits_remaining} video` };
    }

    case "reset_credits": {
      const sub = await getSubscription();
      if (!sub) return fail("No subscription to reset credits for", 404);
      const now = new Date();
      const cycleEnd = new Date(now);
      cycleEnd.setMonth(cycleEnd.getMonth() + 1);
      await audit();
      const { error } = await admin.rpc("reset_credits", {
        p_subscription_id: sub.id,
        p_cycle_start: now.toISOString(),
        p_cycle_end: cycleEnd.toISOString(),
      });
      if (error) return fail("Could not reset credits", 500);
      return { ok: true, message: "Credits reset to the plan's monthly allowance" };
    }

    case "ban":
    case "unban": {
      if (isAdminTarget || targetId === ctx.userId) return fail("Administrator accounts can't be suspended here", 409);
      await audit();
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: input.action === "ban" ? "876000h" : "none",
      });
      if (error) return fail("Could not update the account's suspension", 500);
      return { ok: true, message: input.action === "ban" ? "Account suspended (cannot sign in)" : "Account reinstated" };
    }

    case "update_profile": {
      if (!input.full_name && !input.email) return fail("Nothing to change");
      await audit({
        before_name: profile.full_name,
        after_name: input.full_name ?? null,
        before_email: profile.email,
        after_email: input.email ?? null,
      });
      if (input.email && input.email !== profile.email) {
        const { error } = await admin.auth.admin.updateUserById(targetId, { email: input.email, email_confirm: true });
        if (error) return fail(`Could not change the sign-in email: ${error.message}`, 409);
      }
      const { error } = await admin
        .from("profiles")
        .update({
          ...(input.full_name ? { full_name: input.full_name } : {}),
          ...(input.email ? { email: input.email } : {}),
        })
        .eq("id", targetId);
      if (error) return fail("Could not update the profile", 500);
      return { ok: true, message: "Profile updated" };
    }

    case "delete_account": {
      if (isAdminTarget || targetId === ctx.userId) return fail("Administrator accounts can't be deleted here", 409);
      if (input.confirm_email.toLowerCase() !== profile.email.toLowerCase()) return fail("Confirmation email doesn't match");
      await audit();
      const result = await deleteAccountCompletely(admin, { id: targetId, email: profile.email });
      if (!result.ok) {
        return fail(
          result.error === "team_has_members"
            ? "This user owns a team that still has other members. Remove them first."
            : "Deletion failed — check the server logs",
          result.error === "team_has_members" ? 409 : 500,
        );
      }
      return { ok: true, message: "Account permanently deleted" };
    }
  }
}
