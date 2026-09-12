import type { Profile, Subscription } from "@/lib/types/database.types";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { SignOutButton } from "@/components/nav/SignOutButton";

export function TopBar({
  profile,
  subscription,
}: {
  profile: Profile;
  subscription: Subscription | null;
}) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
      <div className="text-sm text-neutral-500">{profile.email}</div>
      <div className="flex items-center gap-3">
        {subscription && <PlanBadge planCode={subscription.plan_code} status={subscription.status} />}
        <SignOutButton />
      </div>
    </header>
  );
}
