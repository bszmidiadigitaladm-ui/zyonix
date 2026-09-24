"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ART_QUALITY_CHOICES,
  ART_STYLES,
  OUTPUT_FORMATS,
  type ArtQualityChoice,
  type ArtStyle,
  type OutputFormat,
} from "@/lib/openai/art";
import { ART_JOB_STARTED_EVENT, fetchArtJobs } from "@/lib/art/client";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

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

const QUALITY_KEY: Record<ArtQualityChoice, { label: string; hint: string }> = {
  medium: { label: "qualityMedium", hint: "qualityMediumHint" },
  high: { label: "qualityHigh", hint: "qualityHighHint" },
};

const POLL_MS = 3000;
// Well past the point where the server treats a job as lost and refunds it.
const POLL_GIVE_UP_MS = 5 * 60 * 1000;

export interface ArtFormInitial {
  verseReference?: string;
  theme?: string;
  style?: ArtStyle;
  format?: OutputFormat;
  variationOf?: string;
}

export function ArtForm({
  canChooseQuality,
  initial,
}: {
  canChooseQuality: boolean;
  initial?: ArtFormInitial;
}) {
  const t = useTranslations("art");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verseReference, setVerseReference] = useState(initial?.verseReference ?? "");
  const [theme, setTheme] = useState(() => initial?.theme ?? searchParams.get("theme") ?? "");
  const [style, setStyle] = useState<ArtStyle>(initial?.style ?? "cinematic");
  const [format, setFormat] = useState<OutputFormat>(initial?.format ?? "square");
  const [quality, setQuality] = useState<ArtQualityChoice>("medium");
  const [submitting, setSubmitting] = useState(false);
  // The job this page is waiting on (medium quality shows the result right here).
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [backgroundNotice, setBackgroundNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!waitingFor) return;
    const startedAt = Date.now();
    let cancelled = false;

    async function check() {
      const jobs = await fetchArtJobs();
      if (cancelled) return;
      const job = jobs?.find((j) => j.id === waitingFor);
      if (job?.status === "completed" && job.image_url) {
        setResultUrl(job.image_url);
        setWaitingFor(null);
        router.refresh();
      } else if (job?.status === "failed" || Date.now() - startedAt > POLL_GIVE_UP_MS) {
        setError(t("jobFailed"));
        setWaitingFor(null);
      }
    }

    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [waitingFor, router, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBackgroundNotice(false);

    if (!verseReference.trim() && !theme.trim()) {
      setError(t("enterVerseOrTheme"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ai/art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verse_reference: verseReference.trim() || undefined,
          theme: theme.trim() || undefined,
          style,
          output_format: format,
          quality,
          variation_of: initial?.variationOf,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "insufficient_credits") setError(t("outOfCredits"));
        else if (data.error === "too_many_pending") setError(t("tooManyPending"));
        else setError(t("genericError"));
        return;
      }

      setResultUrl(null);
      const jobId: string = data.generation.id;
      if (canChooseQuality && quality === "high") {
        // Slow: hand it to the in-app notifier and let the person carry on.
        setBackgroundNotice(true);
        window.dispatchEvent(new CustomEvent(ART_JOB_STARTED_EVENT, { detail: { id: jobId } }));
      } else {
        setWaitingFor(jobId);
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || waitingFor !== null;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {initial?.variationOf && <p className="text-sm text-muted">{t("variationNotice")}</p>}

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

        {canChooseQuality && (
          <fieldset>
            <legend className="mb-1 block text-sm font-medium">{t("quality")}</legend>
            <div className="grid gap-2">
              {ART_QUALITY_CHOICES.map((q) => (
                <label
                  key={q}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition",
                    quality === q ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
                  )}
                >
                  <input
                    type="radio"
                    name="quality"
                    value={q}
                    checked={quality === q}
                    onChange={() => setQuality(q)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block font-medium">{t(QUALITY_KEY[q].label)}</span>
                    <span className="block text-xs text-muted">{t(QUALITY_KEY[q].hint)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={busy}>
          {busy ? t("generating") : t("generate")}
        </Button>
      </form>

      <Card className="flex items-center justify-center border-dashed p-4">
        {resultUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resultUrl} alt="Generated Bible art" className="max-h-[480px] rounded-lg" />
        ) : waitingFor ? (
          <p className="text-center text-sm text-muted">{t("generatingWait")}</p>
        ) : backgroundNotice ? (
          <p className="text-center text-sm text-muted">{t("generatingBackground")}</p>
        ) : (
          <p className="text-sm text-muted">{t("resultPlaceholder")}</p>
        )}
      </Card>
    </div>
  );
}
