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

// Posters are generated as 2:3 (1024x1536) but designed as 4:5, so what people see
// and download is the centered 4:5 crop.
const OUTPUT_W = 1080;
const OUTPUT_H = 1350;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Crops the generated poster to 4:5 and saves it as a PNG. Returns false if it could not be exported. */
export async function downloadPosterPng(url: string, filename: string): Promise<boolean> {
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const scale = Math.max(OUTPUT_W / img.width, OUTPUT_H / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, (OUTPUT_W - drawW) / 2, (OUTPUT_H - drawH) / 2, drawW, drawH);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.click();
    return true;
  } catch {
    return false;
  }
}

/** Shrinks a photo so the upload stays small; returns a JPEG. */
export async function resizePhoto(file: File, maxSize = 1024): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) return file;
    return new File([blob], "speaker.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
