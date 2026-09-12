"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function NoteEditor({
  devotionalId,
  initialNote,
}: {
  devotionalId: string;
  initialNote: string;
}) {
  const t = useTranslations("devotionals");
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/ai/devotional/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devotional_id: devotionalId, note }),
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      <label className="mb-1 block text-sm font-medium">{t("yourNotes")}</label>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder={t("notePlaceholder")}
      />
      <div className="mt-2 flex items-center gap-3">
        <Button variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("saveNote")}
        </Button>
        {savedAt && <span className="text-xs text-muted">{t("saved")}</span>}
      </div>
    </div>
  );
}
