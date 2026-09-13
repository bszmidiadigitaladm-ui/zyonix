import type { Profile, Subscription } from "@/lib/types/database.types";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { SignOutButton } from "@/components/nav/SignOutButton";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function TopBar({
  profile,
  subscription,
}: {
  profile: Profile;
  subscription: Subscription | null;
}) {
  const displayName = profile.full_name ?? profile.email;
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface/40 px-6 py-3">
      <div className="text-sm text-muted">{profile.email}</div>
      <div className="flex items-center gap-3">
        {subscription && <PlanBadge planCode={subscription.plan_code} status={subscription.status} />}
        <LanguageSwitcher className="w-auto py-1 text-xs" />
        <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {initial}
          </span>
          <span className="max-w-[10rem] truncate text-sm font-medium">{displayName}</span>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
