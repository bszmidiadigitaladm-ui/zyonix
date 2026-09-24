// Browser-side helpers for poster templates.

export interface PosterJobStatus {
  id: string;
  status: "pending" | "completed" | "failed";
  image_url: string | null;
  template_slug: string;
  created_at: string;
}

/** The person's running and recently finished poster jobs, or null if the request failed. */
export async function fetchPosterJobs(): Promise<PosterJobStatus[] | null> {
  try {
    const res = await fetch("/api/ai/poster/jobs", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { jobs: PosterJobStatus[] };
    return data.jobs;
  } catch {
    return null;
  }
}

export type PosterFormat = "feed" | "story";

export function toPosterFormat(value: unknown): PosterFormat {
  return value === "story" ? "story" : "feed";
}

// Posters are generated as 2:3 (1024x1536). A feed poster is designed at 4:5 and a
// Story at 9:16, so what people see and download is the centered crop of that shape:
// top and bottom trimmed for feed, the sides trimmed for Story.
const OUTPUT_SIZE: Record<PosterFormat, { w: number; h: number }> = {
  feed: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Crops the generated poster to its format and saves it as a PNG. Returns false if it could not be exported. */
export async function downloadPosterPng(url: string, filename: string, format: PosterFormat): Promise<boolean> {
  try {
    const { w, h } = OUTPUT_SIZE[format];
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const scale = Math.max(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.click();
    return true;
  } catch {
    return false;
  }
}

/**
 * Shrinks an uploaded image so the upload stays small. Photos become JPEGs; logos
 * stay PNGs so transparent backgrounds are kept.
 */
export async function resizeImage(
  file: File,
  options: { maxSize: number; keepTransparency?: boolean },
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    const scale = Math.min(1, options.maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);

    const type = options.keepTransparency ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88));
    if (!blob) return file;
    return new File([blob], options.keepTransparency ? "logo.png" : "speaker.jpg", { type });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
