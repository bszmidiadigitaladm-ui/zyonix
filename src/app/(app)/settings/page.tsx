import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm";

export default async function SettingsPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("settings");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader icon={Settings} title={t("title")} />
      <NotificationSettingsForm
        initialEnabled={profile.daily_reminder_enabled}
        initialSlot={profile.reminder_slot}
      />
    </div>
  );
}
