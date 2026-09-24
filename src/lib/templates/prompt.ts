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
  hasPhoto: boolean;
}

/**
 * The instruction sent to the image model. The poster is padded into a taller
 * 2:3 canvas (the model's output shape); the page crops the result back to 4:5.
 */
export function buildPosterPrompt(template: PosterTemplate, input: PosterEditInput): string {
  const lines: string[] = [
    "Edit image 1, a finished church social media poster. Keep the exact same design, layout, photography or illustration, decorative elements and lettering style.",
    "The poster is a 4:5 design placed in the middle of a taller canvas: extend its background seamlessly into the top and bottom margins, and keep ALL text and important elements inside the central area, exactly where they are now.",
    "Render every piece of text exactly as written, with the same spelling, capitalization and punctuation (keep dots in web addresses and colons in times). Text must be crisp and fully legible.",
  ];

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

  if (input.hasPhoto && template.photoSlot) {
    lines.push(
      "Image 2 is a photo of the speaker. Replace the person shown in the poster's photo with the person in image 2, keeping their face, hair and skin tone faithful, cropped to fit the same frame and style.",
    );
  }

  lines.push(
    `The client's instructions (apply them exactly; they take priority for the wording of the headline): "${input.instructions.trim()}"`,
    "Do not add any other text.",
  );
  return lines.join("\n");
}
