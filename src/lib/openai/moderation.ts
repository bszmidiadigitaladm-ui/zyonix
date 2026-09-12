import { getOpenAI } from "@/lib/openai/client";
import type { Moderation } from "openai/resources/moderations";

const SELF_HARM_CATEGORIES: (keyof Moderation.Categories)[] = [
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
];

export interface ModerationResult {
  /** true if flagged, false if clean, null if the moderation call itself failed */
  selfHarmFlagged: boolean | null;
  categories: Moderation.Categories | null;
}

/**
 * Checks a message against OpenAI's moderation endpoint for self-harm signals.
 * Fails "inconclusive" rather than throwing — the caller (chat route) still
 * runs the keyword fallback layer regardless, and logs the moderation failure
 * separately so it doesn't silently mask a real crisis-detection gap.
 */
export async function checkSelfHarmModeration(text: string): Promise<ModerationResult> {
  try {
    const openai = getOpenAI();
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const result = response.results[0];
    if (!result) return { selfHarmFlagged: null, categories: null };

    const flagged = SELF_HARM_CATEGORIES.some((category) => result.categories[category]);
    return { selfHarmFlagged: flagged, categories: result.categories };
  } catch (err) {
    console.error("OpenAI moderation call failed", err);
    return { selfHarmFlagged: null, categories: null };
  }
}
