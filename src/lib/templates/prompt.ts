import { FONT_STYLES, type FontStyleKey, type PosterTemplate, type TemplateField } from "@/lib/templates/catalog";

const FIELD_LABEL: Record<TemplateField, string> = {
  church: "Church name",
  date: "Date",
  time: "Time",
  location: "Location / address",
  website: "Website or link",
  speaker: "Speaker name",
  theme: "Theme / title line",
  ages: "Ages",
  quote: "Quote or verse text",
  reference: "Scripture reference",
};

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export interface PosterEditInput {
  fields: Partial<Record<TemplateField, string>>;
  instructions: string;
  colors: { background?: string; text?: string; accent?: string };
  font?: FontStyleKey;
  format: "feed" | "story";
  hasPhoto: boolean;
  hasLogo: boolean;
}

/**
 * The instruction sent to the image model. The template is padded into a taller
 * 2:3 canvas (the model's output shape). A feed poster is cropped back to 4:5
 * afterwards; a Story is recomposed for 9:16 and cropped at the sides.
 */
export function buildPosterPrompt(template: PosterTemplate, input: PosterEditInput): string {
  const lines: string[] = [
    "Edit image 1, a finished church social media poster. Keep the same design style, photography or illustration, decorative elements and lettering style.",
  ];

  if (input.format === "story") {
    lines.push(
      "Adapt it into a 9:16 vertical Instagram Story. The canvas is taller than the poster: extend the background scene and decorative elements naturally to fill the whole canvas and recompose the layout vertically (headline in the upper part, details in the lower part).",
      "Keep ALL text inside the central 80% of the canvas width, and keep text away from the very top 14% and the very bottom 20% of the canvas, which the Story interface covers.",
    );
  } else {
    lines.push(
      "Keep the same layout and composition. The poster is a 4:5 design placed in the middle of a taller canvas: extend its background seamlessly into the top and bottom margins, and keep ALL text and important elements inside the central area, exactly where they are now.",
    );
  }
  lines.push(
    "Render every piece of text exactly as written, with the same spelling, capitalization and punctuation (keep dots in web addresses and colons in times). Text must be crisp and fully legible.",
  );

  const provided = template.fields.filter((f) => input.fields[f]?.trim());
  if (provided.length > 0) {
    lines.push("Replace the placeholder text on the poster (such as YOUR CHURCH NAME or ADD DATE HERE) with these details:");
    for (const field of provided) {
      lines.push(`- ${FIELD_LABEL[field]}: "${input.fields[field]!.trim()}"`);
    }
  }
  lines.push(
    "Any placeholder text that has no detail listed here must be removed cleanly, together with its icon or box, so the layout stays balanced and no 'ADD ... HERE' wording remains.",
    "Keep the main headline and its main subtitle unless the client's instructions say otherwise. Any other tiny decorative text, taglines or handwritten words that are not listed here must be removed cleanly, leaving plain background.",
  );

  const { background, text, accent } = input.colors;
  const colorParts = [
    background && `background color ${background}`,
    text && `main text color ${text}`,
    accent && `accent color ${accent}`,
  ].filter(Boolean);
  if (colorParts.length > 0) {
    lines.push(`Change the color scheme: ${colorParts.join(", ")}. Apply it consistently and keep everything readable.`);
  }

  const font = FONT_STYLES.find((f) => f.key === input.font);
  if (font) lines.push(`Use ${font.prompt} for the poster's text.`);

  // Extra images are sent after the template, in this order.
  let next = 2;
  if (input.hasPhoto && template.photoSlot) {
    lines.push(
      `Image ${next} is a photo of the speaker. Replace the person shown in the poster's photo with the person in image ${next}, keeping their face, hair and skin tone faithful, cropped to fit the same frame and style.`,
    );
    next += 1;
  }
  if (input.hasLogo) {
    lines.push(
      `Image ${next} is the church's logo. Place it on the poster in a clean, clearly visible spot near the church name or at the top, at a modest size. Do not redraw, recolor, distort or crop the logo.`,
    );
  }

  lines.push(
    `The client's instructions (apply them exactly; they take priority for the wording of the headline): "${input.instructions.trim()}"`,
    "Do not add any other text.",
  );
  return lines.join("\n");
}
