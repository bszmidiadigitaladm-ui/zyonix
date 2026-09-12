"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplatePicker } from "@/components/posts/TemplatePicker";
import { PostCanvas } from "@/components/posts/PostCanvas";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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
          <Input
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="e.g. Easter Sunday"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Verse reference (optional)</label>
          <Input
            value={verseReference}
            onChange={(e) => setVerseReference(e.target.value)}
            placeholder="e.g. John 3:16"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Format</label>
          <Select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            <option value="feed">Feed</option>
            <option value="story">Story</option>
            <option value="carousel" disabled={!allowCarouselExport}>
              Carousel {!allowCarouselExport && "(upgrade to unlock)"}
            </option>
          </Select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Writing caption…" : "Suggest caption"}
        </Button>
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
