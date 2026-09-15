"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ReminderSlot } from "@/lib/types/database.types";

const SLOTS: ReminderSlot[] = ["morning", "afternoon", "evening"];

export function NotificationSettingsForm({
  initialEnabled,
  initialSlot,
}: {
  initialEnabled: boolean;
  initialSlot: ReminderSlot;
}) {
  const t = useTranslations("settings");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [slot, setSlot] = useState<ReminderSlot>(initialSlot);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_reminder_enabled: enabled, reminder_slot: slot }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{t("dailyReminderTitle")}</h2>
        <p className="text-sm text-muted">{t("dailyReminderSubtitle")}</p>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        {t("enableToggle")}
      </label>

      {enabled && (
        <div>
          <label className="mb-1 block text-sm font-medium">{t("slotLabel")}</label>
          <Select value={slot} onChange={(e) => setSlot(e.target.value as ReminderSlot)}>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {t(`slot_${s}`)}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
        {saved && <span className="text-sm text-accent">{t("saved")}</span>}
      </div>
    </Card>
  );
}
