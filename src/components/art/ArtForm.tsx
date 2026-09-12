"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ART_STYLES, OUTPUT_FORMATS, type ArtStyle, type OutputFormat } from "@/lib/openai/art";
import type { BibleArtGeneration } from "@/lib/types/database.types";

const STYLE_LABEL: Record<ArtStyle, string> = {
  cinematic: "Cinematic",
  "3d_illustration": "3D Illustration",
  watercolor: "Watercolor",
  minimalist: "Minimalist",
};

const FORMAT_LABEL: Record<OutputFormat, string> = {
  square: "Square (feed)",
  story: "Story (vertical)",
};

export function ArtForm() {
  const router = useRouter();
  const [verseReference, setVerseReference] = useState("");
  const [theme, setTheme] = useState("");
  const [style, setStyle] = useState<ArtStyle>("cinematic");
  const [format, setFormat] = useState<OutputFormat>("square");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BibleArtGeneration | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!verseReference.trim() && !theme.trim()) {
      setError("Enter a verse reference or a theme.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verse_reference: verseReference.trim() || undefined,
          theme: theme.trim() || undefined,
          style,
          output_format: format,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "insufficient_credits") {
          setError("You're out of image credits for this cycle. Upgrade your plan or wait for renewal.");
        } else {
          setError(data.error ?? "Something went wrong generating your art.");
        }
        return;
      }

      setResult(data.generation);
      router.refresh();
    } catch {
      setError("Something went wrong generating your art.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Verse reference</label>
          <input
            value={verseReference}
            onChange={(e) => setVerseReference(e.target.value)}
            placeholder="e.g. Psalm 23:1"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="text-center text-xs text-neutral-400">or</div>

        <div>
          <label className="mb-1 block text-sm font-medium">Theme</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. hope in hard times"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Visual style</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as ArtStyle)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {ART_STYLES.map((s) => (
              <option key={s} value={s}>
                {STYLE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as OutputFormat)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "Generating…" : "Generate art"}
        </button>
      </form>

      <div className="flex items-center justify-center rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
        {result ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.image_url} alt="Generated Bible art" className="max-h-[480px] rounded-lg" />
        ) : (
          <p className="text-sm text-neutral-400">Your generated art will appear here</p>
        )}
      </div>
    </div>
  );
}
