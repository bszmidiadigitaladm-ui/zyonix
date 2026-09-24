import { getOpenAI } from "@/lib/openai/client";

export const ART_STYLES = ["cinematic", "3d_illustration", "watercolor", "minimalist"] as const;
export type ArtStyle = (typeof ART_STYLES)[number];

export const OUTPUT_FORMATS = ["square", "story"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

// What a person can pick when their plan allows it. "low" is the fixed quality of
// plans that get reduced-quality art, so it is never offered as a choice.
export const ART_QUALITY_CHOICES = ["medium", "high"] as const;
export type ArtQualityChoice = (typeof ART_QUALITY_CHOICES)[number];

const STYLE_PROMPT_HINTS: Record<ArtStyle, string> = {
  cinematic: "cinematic lighting, dramatic composition, film still",
  "3d_illustration": "3D rendered illustration, soft studio lighting, Pixar-like style",
  watercolor: "delicate watercolor painting, soft edges, visible paper texture",
  minimalist: "minimalist flat design, simple shapes, generous negative space",
};

const FORMAT_SIZE: Record<OutputFormat, "1024x1024" | "1024x1536"> = {
  square: "1024x1024",
  story: "1024x1536",
};

export function buildArtPrompt(params: {
  verseReference?: string;
  theme?: string;
  style: ArtStyle;
  variation?: boolean;
}): string {
  const subject = params.verseReference
    ? `the Bible verse ${params.verseReference}`
    : params.theme
      ? `the theme of ${params.theme}`
      : "a message of Christian faith and hope";

  // Deliberately no verse text baked into the artwork — AI image models render
  // legible text unreliably. This module produces thematic/atmospheric art;
  // the Social Post generator (module 3) is what overlays verse + caption text.
  return (
    `A beautiful, reverent piece of Christian devotional art inspired by ${subject}. ` +
    `${STYLE_PROMPT_HINTS[params.style]}. No text or lettering in the image. ` +
    (params.variation
      ? "Create a fresh variation with a different composition and framing, keeping the same subject and mood. "
      : "") +
    `Wholesome, uplifting, suitable for sharing on social media.`
  );
}

export interface GeneratedImage {
  buffer: Buffer;
}

/**
 * Starter plan gets a lower `quality` setting rather than a pixel-composited
 * watermark — satisfies the brief's "watermark OR reduced resolution" either/or
 * without adding a native image-processing dependency (sharp) whose prebuilt
 * binaries are a common source of breakage across local/Netlify environments.
 */
export async function generateBibleArt(params: {
  prompt: string;
  format: OutputFormat;
  quality: "low" | "medium" | "high";
}): Promise<GeneratedImage> {
  const openai = getOpenAI();
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: params.prompt,
    size: FORMAT_SIZE[params.format],
    quality: params.quality,
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI did not return image data");

  return { buffer: Buffer.from(b64, "base64") };
}
