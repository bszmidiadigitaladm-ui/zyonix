import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm";
import { AccountDataCard } from "@/components/settings/AccountDataCard";

export default async function SettingsPage() {
  const { profile, subscription } = await requireOnboardedUser();
  const t = await getTranslations("settings");

  // Deleting the account doesn't cancel the Hotmart subscription, so warn while it's still live.
  const hasActiveSubscription = subscription.status !== "canceled";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader icon={Settings} title={t("title")} />
      <NotificationSettingsForm
        initialEnabled={profile.daily_reminder_enabled}
        initialSlot={profile.reminder_slot}
      />
      <AccountDataCard email={profile.email} hasActiveSubscription={hasActiveSubscription} />
    </div>
  );
}
