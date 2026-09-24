import { toFile } from "openai";
import { getOpenAIDirect } from "@/lib/openai/client";

export interface PosterImageInput {
  buffer: Buffer;
  contentType: string;
}

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Re-renders a poster template with the person's details. `template` is the padded
 * 2:3 image (image 1); `extras` are the optional speaker photo and church logo, in
 * the order the prompt refers to them. Returns a 1024x1536 PNG.
 */
export async function generatePoster(params: {
  prompt: string;
  template: PosterImageInput;
  extras?: PosterImageInput[];
}): Promise<Buffer> {
  // Uploads files, so it must not go through a JSON-only gateway (see client.ts).
  const openai = getOpenAIDirect();
  const images = [await toFile(params.template.buffer, "template.jpg", { type: params.template.contentType })];
  for (const [i, extra] of (params.extras ?? []).entries()) {
    const ext = EXTENSION[extra.contentType] ?? "jpg";
    images.push(await toFile(extra.buffer, `extra-${i + 1}.${ext}`, { type: extra.contentType }));
  }

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: images,
    prompt: params.prompt,
    size: "1024x1536",
    quality: "medium",
    input_fidelity: "high",
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI did not return image data");
  return Buffer.from(b64, "base64");
}
