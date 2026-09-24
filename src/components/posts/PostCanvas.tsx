"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

type PostFormat = "feed" | "story" | "carousel";

const CANVAS_SIZE: Record<PostFormat, { w: number; h: number }> = {
  feed: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  carousel: { w: 1080, h: 1080 },
};

const REFERENCE_SIZE = 34;

// Text size in canvas pixels, so a short verse is large and a paragraph still fits.
function overlayFontSize(text: string): number {
  if (text.length <= 60) return 72;
  if (text.length <= 140) return 58;
  return 46;
}

/**
 * The image people post: background art (or template) with an optional short text
 * on top. The caption is written separately and is not part of the image.
 */
export function PostCanvas({
  imageUrl,
  overlayText,
  verseReference,
  format,
}: {
  imageUrl: string | null;
  overlayText?: string;
  verseReference?: string;
  format: PostFormat;
}) {
  const t = useTranslations("posts");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const dims = CANVAS_SIZE[format] ?? CANVAS_SIZE.feed;
  const text = overlayText?.trim() ?? "";
  const fontSize = overlayFontSize(text);
  const hasContent = Boolean(imageUrl || text || verseReference);

  async function handleDownload() {
    setDownloadError(null);
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#171717";
    ctx.fillRect(0, 0, dims.w, dims.h);

    if (imageUrl) {
      try {
        const img = await loadImage(imageUrl);
        drawCover(ctx, img, dims.w, dims.h);
      } catch {
        setDownloadError(t("downloadImageError"));
      }
    }

    if (text || verseReference) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, dims.w, dims.h);
    }

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 14;

    if (text) {
      ctx.font = `700 ${fontSize}px sans-serif`;
      const lines = wrapLines(ctx, text, dims.w * 0.8);
      const lineHeight = fontSize * 1.25;
      lines.forEach((line, i) => {
        ctx.fillText(line, dims.w / 2, dims.h / 2 + (i - (lines.length - 1) / 2) * lineHeight);
      });
    }

    if (verseReference) {
      ctx.font = `italic ${REFERENCE_SIZE}px sans-serif`;
      ctx.fillText(verseReference, dims.w / 2, dims.h * 0.9);
    }

    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      setDownloadError(t("downloadCorsError"));
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "post.png";
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-full max-w-xs overflow-hidden rounded-lg bg-surface-raised"
        style={{ aspectRatio: dims.w / dims.h, containerType: "inline-size" }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {(text || verseReference) && <div className="absolute inset-0 bg-black/35" />}
        {text ? (
          <p
            className="absolute inset-0 flex items-center justify-center px-[10%] text-center font-bold text-white"
            style={{
              fontSize: `calc(${fontSize / dims.w} * 100cqw)`,
              lineHeight: 1.25,
              textShadow: "0 1px 12px rgba(0,0,0,0.6)",
            }}
          >
            <span>{text}</span>
          </p>
        ) : (
          !imageUrl && (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
              {t("overlayPlaceholder")}
            </p>
          )
        )}
        {verseReference && (
          <p
            className="absolute inset-x-0 text-center italic text-white"
            style={{
              bottom: "6%",
              fontSize: `calc(${REFERENCE_SIZE / dims.w} * 100cqw)`,
              textShadow: "0 1px 8px rgba(0,0,0,0.6)",
            }}
          >
            {verseReference}
          </p>
        )}
      </div>

      {downloadError && <p className="text-xs text-danger">{downloadError}</p>}

      <Button onClick={handleDownload} disabled={!hasContent}>
        {t("downloadPng")}
      </Button>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Fills the canvas with the image, cropping the overflow instead of stretching it.
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}
