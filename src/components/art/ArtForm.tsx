"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ART_STYLES, OUTPUT_FORMATS, type ArtStyle, type OutputFormat } from "@/lib/openai/art";
import type { BibleArtGeneration } from "@/lib/types/database.types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const STYLE_KEY: Record<ArtStyle, string> = {
  cinematic: "styleCinematic",
  "3d_illustration": "style3d",
  watercolor: "styleWatercolor",
  minimalist: "styleMinimalist",
};

const FORMAT_KEY: Record<OutputFormat, string> = {
  square: "formatSquare",
  story: "formatStory",
};

export function ArtForm() {
  const t = useTranslations("art");
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
      setError(t("enterVerseOrTheme"));
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
          setError(t("outOfCredits"));
        } else {
          setError(data.error ?? t("genericError"));
        }
        return;
      }

      setResult(data.generation);
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("verseReference")}</label>
          <Input
            value={verseReference}
            onChange={(e) => setVerseReference(e.target.value)}
            placeholder={t("verseSamplePlaceholder")}
          />
        </div>

        <div className="text-center text-xs text-muted">{t("or")}</div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("theme")}</label>
          <Input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder={t("themePlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("visualStyle")}</label>
          <Select value={style} onChange={(e) => setStyle(e.target.value as ArtStyle)}>
            {ART_STYLES.map((s) => (
              <option key={s} value={s}>
                {t(STYLE_KEY[s])}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("format")}</label>
          <Select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {t(FORMAT_KEY[f])}
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? t("generating") : t("generate")}
        </Button>
      </form>

      <Card className="flex items-center justify-center border-dashed p-4">
        {result ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.image_url} alt="Generated Bible art" className="max-h-[480px] rounded-lg" />
        ) : (
          <p className="text-sm text-muted">{t("resultPlaceholder")}</p>
        )}
      </Card>
    </div>
  );
}
