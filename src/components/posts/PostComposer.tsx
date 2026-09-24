"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PostCanvas } from "@/components/posts/PostCanvas";
import { CopyCaptionButton } from "@/components/posts/CopyCaptionButton";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Format = "feed" | "story" | "carousel";

export interface ComposerArt {
  id: string;
  image_url: string;
  verse_reference: string | null;
  theme: string | null;
  output_format: "square" | "story";
}

export function PostComposer({
  arts,
  initialArtId,
  allowCarouselExport,
}: {
  arts: ComposerArt[];
  initialArtId?: string;
  allowCarouselExport: boolean;
}) {
  const t = useTranslations("posts");
  const tArt = useTranslations("art");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const startingArt = arts.find((a) => a.id === initialArtId) ?? arts[0] ?? null;
  const [background, setBackground] = useState<ComposerArt | null>(startingArt);
  const [overlayText, setOverlayText] = useState("");
  const [occasion, setOccasion] = useState("");
  const [verseReference, setVerseReference] = useState(startingArt?.verse_reference ?? "");
  const [format, setFormat] = useState<Format>(startingArt?.output_format === "story" ? "story" : "feed");
  const [captionText, setCaptionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickArt(art: ComposerArt) {
    setBackground(art);
    setFormat(art.output_format === "story" ? "story" : "feed");
    if (!verseReference.trim() && art.verse_reference) setVerseReference(art.verse_reference);
  }

  async function handleSuggestCaption() {
    if (!occasion.trim()) {
      setError(t("enterOccasion"));
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          art_generation_id: background?.id,
          overlay_text: overlayText.trim() || undefined,
          occasion: occasion.trim(),
          verse_reference: verseReference.trim() || undefined,
          format,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error === "insufficient_credits"
            ? t("outOfCredits")
            : (data.error ?? tCommon("somethingWentWrong")),
        );
        return;
      }

      setCaptionText(data.generation.caption_text ?? "");
      router.refresh();
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  const backgroundUrl = background?.image_url ?? null;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("background")}</label>
          {arts.length === 0 ? (
            <p className="text-sm text-muted">
              {t("noArtYet")}{" "}
              <Link href="/art" className="font-medium text-accent hover:underline">
                {t("createArtLink")}
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {arts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => pickArt(art)}
                  aria-label={art.verse_reference ?? art.theme ?? tArt("fallbackLabel")}
                  className={cn(
                    "overflow-hidden rounded-lg border",
                    background?.id === art.id ? "border-accent" : "border-border",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={art.image_url} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted">
            {t("posterTemplatesHint")}{" "}
            <Link href="/templates" className="font-medium text-accent hover:underline">
              {t("posterTemplatesLink")}
            </Link>
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("textOnImage")}</label>
          <Textarea
            rows={3}
            maxLength={400}
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder={t("textOnImagePlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("verseReferenceOptional")}</label>
          <Input
            value={verseReference}
            onChange={(e) => setVerseReference(e.target.value)}
            placeholder={t("versePlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("format")}</label>
          <Select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            <option value="feed">{t("formatFeed")}</option>
            <option value="story">{t("formatStory")}</option>
            <option value="carousel" disabled={!allowCarouselExport}>
              {t("formatCarousel")} {!allowCarouselExport && t("carouselLocked")}
            </option>
          </Select>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <label className="text-sm font-medium">{t("captionLabel")}</label>
          <Textarea
            rows={5}
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            placeholder={t("captionWritePlaceholder")}
          />
          <div className="mt-1">
            <label className="mb-1 block text-xs text-muted">{t("occasionForAi")}</label>
            <Input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder={t("themePlaceholder")}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSuggestCaption} disabled={loading}>
              {loading ? t("writingCaption") : t("suggestCaption")}
            </Button>
            <CopyCaptionButton text={captionText} />
          </div>
        </div>
      </div>

      <PostCanvas
        imageUrl={backgroundUrl}
        overlayText={overlayText}
        verseReference={verseReference.trim() || undefined}
        format={format}
      />
    </div>
  );
}
