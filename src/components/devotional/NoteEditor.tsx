"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function NoteEditor({
  devotionalId,
  initialNote,
}: {
  devotionalId: string;
  initialNote: string;
}) {
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
      <label className="mb-1 block text-sm font-medium">Your notes</label>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="What stood out to you today?"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save note"}
        </Button>
        {savedAt && <span className="text-xs text-muted">Saved</span>}
      </div>
    </div>
  );
}
