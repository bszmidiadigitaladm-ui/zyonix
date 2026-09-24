import { toFile } from "openai";
import { getOpenAI } from "@/lib/openai/client";

export interface PosterImageInput {
  buffer: Buffer;
  contentType: string;
}

/**
 * Re-renders a poster template with the person's details. `template` is the
 * padded 2:3 image; `photo` (optional) is the speaker's photo, sent as image 2.
 * Returns a 1024x1536 PNG.
 */
export async function generatePoster(params: {
  prompt: string;
  template: PosterImageInput;
  photo?: PosterImageInput;
}): Promise<Buffer> {
  const openai = getOpenAI();
  const images = [await toFile(params.template.buffer, "template.jpg", { type: params.template.contentType })];
  if (params.photo) {
    images.push(await toFile(params.photo.buffer, "speaker.jpg", { type: params.photo.contentType }));
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
