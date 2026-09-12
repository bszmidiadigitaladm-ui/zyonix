"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const CANVAS_SIZE: Record<"feed" | "story" | "carousel", { w: number; h: number }> = {
  feed: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  carousel: { w: 1080, h: 1080 },
};

export function PostCanvas({
  imageUrl,
  captionText,
  verseReference,
  format,
}: {
  imageUrl: string | null;
  captionText: string;
  verseReference?: string;
  format: "feed" | "story" | "carousel";
}) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const dims = CANVAS_SIZE[format as keyof typeof CANVAS_SIZE] ?? CANVAS_SIZE.feed;
  const aspect = dims.w / dims.h;

  async function handleDownload() {
    setDownloadError(null);
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#171717";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageUrl) {
      try {
        const img = await loadImage(imageUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
      } catch {
        setDownloadError("Couldn't load the template image for export — downloading text only.");
      }
    }

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "600 44px sans-serif";
    wrapText(ctx, captionText, canvas.width / 2, canvas.height * 0.72, canvas.width * 0.85, 54);

    if (verseReference) {
      ctx.font = "italic 32px sans-serif";
      ctx.fillText(verseReference, canvas.width / 2, canvas.height * 0.93);
    }

    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      setDownloadError("This image can't be exported due to cross-origin restrictions.");
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
        style={{ aspectRatio: aspect }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-center text-white">
          <p className="text-sm font-semibold">{captionText || "Your caption will appear here"}</p>
          {verseReference && <p className="mt-1 text-xs italic text-neutral-300">{verseReference}</p>}
        </div>
      </div>

      {downloadError && <p className="text-xs text-danger">{downloadError}</p>}

      <Button onClick={handleDownload} disabled={!captionText}>
        Download PNG
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}
