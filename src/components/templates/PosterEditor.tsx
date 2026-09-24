"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bebas_Neue, Dancing_Script, Fredoka, Montserrat, Playfair_Display } from "next/font/google";
import { ART_JOB_STARTED_EVENT } from "@/lib/art/client";
import { downloadPosterPng, fetchPosterJobs, resizePhoto } from "@/lib/posters/client";
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
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PosterEditor({ template }: { template: PosterTemplate }) {
  const t = useTranslations("templates");
  const router = useRouter();

  const [values, setValues] = useState<Partial<Record<TemplateField, string>>>({});
  const [instructions, setInstructions] = useState("");
  const [colors, setColors] = useState<Partial<Record<ColorKey, string>>>({});
  const [font, setFont] = useState<FontStyleKey | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);
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

  useEffect(
    () => () => {
      const pending = waitingRef.current;
      if (pending) {
        window.dispatchEvent(new CustomEvent(ART_JOB_STARTED_EVENT, { detail: { id: pending, kind: "poster" } }));
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setError(t("photoInvalid"));
      return;
    }
    setError(null);
    try {
      const small = await resizePhoto(file);
      setPhoto(small);
      setPhotoPreview(URL.createObjectURL(small));
    } catch {
      setError(t("photoInvalid"));
    }
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoConsent(false);
  }

  function toggleColor(key: ColorKey, on: boolean) {
    setColors((prev) => {
      const next = { ...prev };
      if (on) next[key] = COLOR_DEFAULTS[key];
      else delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!instructions.trim()) {
      setError(t("instructionsRequired"));
      return;
    }
    if (photo && !photoConsent) {
      setError(t("photoConsentRequired"));
      return;
    }

    const body = new FormData();
    body.set("template", template.slug);
    body.set("instructions", instructions.trim());
    body.set("fields", JSON.stringify(values));
    body.set("colors", JSON.stringify(colors));
    if (font) body.set("font", font);
    if (photo) body.set("photo", photo);

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

      setResultUrl(null);
      setDownloadError(false);
      setWaitingFor(data.generation.id);
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    if (!resultUrl) return;
    setDownloadError(false);
    const ok = await downloadPosterPng(resultUrl, `${template.slug}.png`);
    if (!ok) setDownloadError(true);
  }

  const busy = submitting || waitingFor !== null;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

        {template.photoSlot && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">{t("photo")}</h3>
            <p className="mb-2 text-xs text-muted">{t("photoHint")}</p>
            {photoPreview ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" onClick={removePhoto} className="text-xs text-muted hover:text-foreground">
                  {t("photoRemove")}
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept={PHOTO_TYPES.join(",")}
                onChange={handlePhoto}
                className="text-xs text-muted file:mr-3 file:rounded-full file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-foreground"
              />
            )}
            {photo && (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={photoConsent}
                  onChange={(e) => setPhotoConsent(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                {t("photoConsent")}
              </label>
            )}
          </div>
        )}

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
          {resultUrl ? (
            <div className="flex flex-col gap-3">
              <PosterImage src={resultUrl} />
              <Button type="button" onClick={handleDownload}>
                {t("download")}
              </Button>
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
