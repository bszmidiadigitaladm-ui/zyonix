"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplatePicker } from "@/components/posts/TemplatePicker";
import { PostCanvas } from "@/components/posts/PostCanvas";
import type { SeasonalTemplate } from "@/lib/types/database.types";

type Format = "feed" | "story" | "carousel";

export function PostComposer({
  templates,
  allowSeasonalTemplates,
  allowCarouselExport,
}: {
  templates: SeasonalTemplate[];
  allowSeasonalTemplates: boolean;
  allowCarouselExport: boolean;
}) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<SeasonalTemplate | null>(
    templates[0] ?? null,
  );
  const [occasion, setOccasion] = useState("");
  const [verseReference, setVerseReference] = useState("");
  const [format, setFormat] = useState<Format>("feed");
  const [captionText, setCaptionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!occasion.trim()) {
      setError("Enter a theme or occasion for the caption.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate?.id,
          occasion: occasion.trim(),
          verse_reference: verseReference.trim() || undefined,
          format,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error === "insufficient_credits"
            ? "You're out of text credits for this cycle."
            : (data.error ?? "Something went wrong."),
        );
        return;
      }

      setCaptionText(data.generation.caption_text);
      router.refresh();
    } catch {
      setError("Something went wrong generating the caption.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Template</label>
          <TemplatePicker
            templates={templates}
            allowExclusive={allowSeasonalTemplates}
            selectedId={selectedTemplate?.id ?? null}
            onSelect={setSelectedTemplate}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Theme / occasion</label>
          <input
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="e.g. Easter Sunday"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Verse reference (optional)</label>
          <input
            value={verseReference}
            onChange={(e) => setVerseReference(e.target.value)}
            placeholder="e.g. John 3:16"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="feed">Feed</option>
            <option value="story">Story</option>
            <option value="carousel" disabled={!allowCarouselExport}>
              Carousel {!allowCarouselExport && "(upgrade to unlock)"}
            </option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "Writing caption…" : "Suggest caption"}
        </button>
      </div>

      <PostCanvas
        imageUrl={selectedTemplate?.asset_url ?? null}
        captionText={captionText}
        verseReference={verseReference || undefined}
        format={format}
      />
    </div>
  );
}
