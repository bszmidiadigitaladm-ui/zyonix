"use client";

import { useState } from "react";

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
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="What stood out to you today?"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
        {savedAt && <span className="text-xs text-neutral-400">Saved</span>}
      </div>
    </div>
  );
}
