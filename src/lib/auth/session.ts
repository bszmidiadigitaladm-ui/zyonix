import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Subscription } from "@/lib/types/database.types";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

/** Resolves the "wallet" id credits are drawn from: the team, if the user is on one, else the user themself. */
export function resolveCreditOwnerId(profile: Pick<Profile, "id" | "team_id">): string {
  return profile.team_id ?? profile.id;
}

export async function getSubscription(
  profile: Pick<Profile, "id" | "team_id">,
): Promise<Subscription | null> {
  const supabase = await createClient();
  const query = supabase.from("subscriptions").select("*");

  const { data } = profile.team_id
    ? await query.eq("team_id", profile.team_id).maybeSingle()
    : await query.eq("owner_id", profile.id).is("team_id", null).maybeSingle();

  return data;
}

/** Cancel-but-keep-access-until-period-end and past_due-grace logic lives here, in one place. */
export function isBillable(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === "trialing" || subscription.status === "active") return true;
  if (subscription.status === "past_due") return true;
  if (subscription.status === "canceled") {
    return new Date(subscription.current_period_end).getTime() > Date.now();
  }
  return false;
}

export async function requireOnboardedUser() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const subscription = await getSubscription(profile);
  if (!subscription) redirect("/onboarding/plan");

  return { user, profile, subscription, billable: isBillable(subscription) };
}
