"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bebas_Neue, Dancing_Script, Fredoka, Montserrat, Playfair_Display } from "next/font/google";
import { ART_JOB_STARTED_EVENT } from "@/lib/art/client";
import {
  downloadPosterPng,
  fetchPosterJobs,
  resizeImage,
  type PosterFormat,
} from "@/lib/posters/client";
import {
  FONT_STYLES,
  templateThumbUrl,
  type FontStyleKey,
  type PosterTemplate,
  type TemplateField,
} from "@/lib/templates/catalog";
import { PosterImage } from "@/components/templates/PosterImage";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const playfair = Playfair_Display({ subsets: ["latin"], weight: "700" });
const montserrat = Montserrat({ subsets: ["latin"], weight: "700" });
const dancing = Dancing_Script({ subsets: ["latin"], weight: "700" });
const fredoka = Fredoka({ subsets: ["latin"], weight: "600" });

const FONT_PREVIEW: Record<FontStyleKey, { className: string; label: string }> = {
  bold_condensed: { className: bebas.className, label: "fontBold" },
  elegant_serif: { className: playfair.className, label: "fontElegant" },
  modern_sans: { className: montserrat.className, label: "fontModern" },
  handwritten_script: { className: dancing.className, label: "fontScript" },
  friendly_rounded: { className: fredoka.className, label: "fontRounded" },
};

type ColorKey = "background" | "text" | "accent";
const COLOR_DEFAULTS: Record<ColorKey, string> = { background: "#1e3a8a", text: "#ffffff", accent: "#f59e0b" };
const COLOR_LABEL: Record<ColorKey, string> = {
  background: "colorBackground",
  text: "colorText",
  accent: "colorAccent",
};

const POLL_MS = 4000;
const POLL_GIVE_UP_MS = 7 * 60 * 1000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface PosterEditorInitial {
  fields?: Partial<Record<TemplateField, string>>;
  instructions?: string;
  colors?: Partial<Record<ColorKey, string>>;
  font?: FontStyleKey | null;
  format?: PosterFormat;
}

interface Upload {
  file: File;
  preview: string;
  consent: boolean;
}

export function PosterEditor({
  template,
  initial,
}: {
  template: PosterTemplate;
  initial?: PosterEditorInitial;
}) {
  const t = useTranslations("templates");
  const router = useRouter();

  const [values, setValues] = useState<Partial<Record<TemplateField, string>>>(initial?.fields ?? {});
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [colors, setColors] = useState<Partial<Record<ColorKey, string>>>(initial?.colors ?? {});
  const [font, setFont] = useState<FontStyleKey | null>(initial?.font ?? null);
  const [format, setFormat] = useState<PosterFormat>(initial?.format ?? "feed");
  const [photo, setPhoto] = useState<Upload | null>(null);
  const [logo, setLogo] = useState<Upload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; format: PosterFormat } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);
  // The format the running job was created with, so its result is shown correctly.
  const jobFormatRef = useRef<PosterFormat>("feed");
  // Read by the unmount cleanup: leaving mid-generation hands the job to the notifier.
  const waitingRef = useRef<string | null>(null);

  useEffect(() => {
    waitingRef.current = waitingFor;
    if (!waitingFor) return;
    const startedAt = Date.now();
    let cancelled = false;

    async function check() {
      const jobs = await fetchPosterJobs();
      if (cancelled) return;
      const job = jobs?.find((j) => j.id === waitingFor);
      if (job?.status === "completed" && job.image_url) {
        setResult({ url: job.image_url, format: jobFormatRef.current });
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

  useEffect(
    () => () => {
      const pending = waitingRef.current;
      if (pending) {
        window.dispatchEvent(new CustomEvent(ART_JOB_STARTED_EVENT, { detail: { id: pending, kind: "poster" } }));
      }
    },
    [],
  );

  const photoPreview = photo?.preview;
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const logoPreview = logo?.preview;
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "photo" | "logo",
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError(t("imageInvalid"));
      return;
    }
    setError(null);
    try {
      const small =
        kind === "logo"
          ? await resizeImage(file, { maxSize: 768, keepTransparency: true })
          : await resizeImage(file, { maxSize: 1024 });
      const upload: Upload = { file: small, preview: URL.createObjectURL(small), consent: false };
      if (kind === "logo") setLogo(upload);
      else setPhoto(upload);
    } catch {
      setError(t("imageInvalid"));
    }
  }

  function toggleColor(key: ColorKey, on: boolean) {
    setColors((prev) => {
      const next = { ...prev };
      if (on) next[key] = COLOR_DEFAULTS[key];
      else delete next[key];
      return next;
    });
  }

  async function generate(nextFormat: PosterFormat) {
    setError(null);

    if (!instructions.trim()) {
      setError(t("instructionsRequired"));
      return;
    }
    if ((photo && !photo.consent) || (logo && !logo.consent)) {
      setError(t("consentRequired"));
      return;
    }

    const body = new FormData();
    body.set("template", template.slug);
    body.set("instructions", instructions.trim());
    body.set("fields", JSON.stringify(values));
    body.set("colors", JSON.stringify(colors));
    body.set("format", nextFormat);
    if (font) body.set("font", font);
    if (photo) body.set("photo", photo.file);
    if (logo) body.set("logo", logo.file);

    setSubmitting(true);
    try {
      const res = await fetch("/api/ai/poster", { method: "POST", body });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "insufficient_credits") setError(t("outOfCredits"));
        else if (data.error === "too_many_pending") setError(t("tooManyPending"));
        else setError(t("genericError"));
        return;
      }

      setResult(null);
      setDownloadError(false);
      setFormat(nextFormat);
      jobFormatRef.current = nextFormat;
      setWaitingFor(data.generation.id);
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    if (!result) return;
    setDownloadError(false);
    const ok = await downloadPosterPng(result.url, `${template.slug}-${result.format}.png`, result.format);
    if (!ok) setDownloadError(true);
  }

  const busy = submitting || waitingFor !== null;

  function renderUpload(kind: "photo" | "logo") {
    const upload = kind === "photo" ? photo : logo;
    const set = kind === "photo" ? setPhoto : setLogo;
    return (
      <div>
        <h3 className="mb-1 text-sm font-semibold">{t(kind === "photo" ? "photo" : "logo")}</h3>
        <p className="mb-2 text-xs text-muted">{t(kind === "photo" ? "photoHint" : "logoHint")}</p>
        {upload ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={upload.preview}
              alt=""
              className={cn("h-16 w-16 rounded-lg", kind === "logo" ? "bg-white object-contain p-1" : "object-cover")}
            />
            <button type="button" onClick={() => set(null)} className="text-xs text-muted hover:text-foreground">
              {t("uploadRemove")}
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={(e) => handleUpload(e, kind)}
            className="text-xs text-muted file:mr-3 file:rounded-full file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-foreground"
          />
        )}
        {upload && (
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={upload.consent}
              onChange={(e) => set({ ...upload, consent: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            {t(kind === "photo" ? "photoConsent" : "logoConsent")}
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void generate(format);
        }}
        className="flex flex-col gap-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">{t("instructions")}</label>
          <Textarea
            rows={3}
            maxLength={600}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t("instructionsHint")}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("format")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["feed", "story"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormat(key)}
                className={cn(
                  "rounded-xl border p-3 text-left text-xs transition",
                  format === key ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
                )}
              >
                <span className="block text-sm font-medium">{t(key === "feed" ? "formatFeed" : "formatStory")}</span>
                <span className="text-muted">{t(key === "feed" ? "formatFeedHint" : "formatStoryHint")}</span>
              </button>
            ))}
          </div>
        </div>

        {template.fields.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t("details")}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {template.fields.map((field) => (
                <div key={field} className={field === "quote" ? "sm:col-span-2" : undefined}>
                  <label className="mb-1 block text-xs font-medium text-muted">{t(`fields.${field}`)}</label>
                  <Input
                    value={values[field] ?? ""}
                    maxLength={field === "quote" ? 400 : 120}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder={t(`fieldHints.${field}`)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {template.photoSlot && renderUpload("photo")}
        {renderUpload("logo")}

        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("colors")}</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(COLOR_LABEL) as ColorKey[]).map((key) => (
              <div key={key} className="rounded-xl border border-border p-2.5">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={key in colors}
                    onChange={(e) => toggleColor(key, e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  {t(COLOR_LABEL[key])}
                </label>
                {colors[key] ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                      aria-label={t(COLOR_LABEL[key])}
                      className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <span className="text-xs text-muted">{colors[key]}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">{t("colorKeep")}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-semibold">{t("font")}</h3>
          <p className="mb-2 text-xs text-muted">{t("fontNote")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setFont(null)}
              className={cn(
                "rounded-xl border p-3 text-left text-xs transition",
                font === null ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
              )}
            >
              <span className="block text-base font-semibold">Aa</span>
              {t("fontKeep")}
            </button>
            {FONT_STYLES.map(({ key }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFont(key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  font === key ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
                )}
              >
                <span className={cn("block text-xl leading-tight", FONT_PREVIEW[key].className)}>
                  {t("fontPreviewText")}
                </span>
                <span className="mt-1 block text-xs text-muted">{t(FONT_PREVIEW[key].label)}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? t("generating") : t("generate")}
          </Button>
          <p className="text-xs text-muted">{t("creditNote")}</p>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <Card className="p-3">
          {result ? (
            <div className="flex flex-col gap-3">
              <PosterImage src={result.url} format={result.format} />
              <Button type="button" onClick={handleDownload}>
                {t("download")}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => generate(result.format)}>
                  {t("createAgain")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => generate(result.format === "feed" ? "story" : "feed")}
                >
                  {t(result.format === "feed" ? "makeStory" : "makeFeed")}
                </Button>
              </div>
              <p className="text-xs text-muted">{t("createAgainHint")}</p>
              {downloadError && <p className="text-xs text-danger">{t("downloadError")}</p>}
              <p className="text-xs text-muted">{t("proofread")}</p>
              <Link href="/templates/mine" className="text-xs font-medium text-accent hover:underline">
                {t("myPosters")}
              </Link>
            </div>
          ) : waitingFor ? (
            <div className="relative">
              <PosterImage src={templateThumbUrl(template.slug)} className="opacity-40" />
              <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-medium">
                {t("waiting")}
              </p>
            </div>
          ) : (
            <PosterImage src={templateThumbUrl(template.slug)} />
          )}
        </Card>
      </div>
    </div>
  );
}
