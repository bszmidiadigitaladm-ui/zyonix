// Estimated provider cost of one AI request, in USD, written to ai_usage_log.estimated_cost_usd
// so the admin panel can show spend per feature, plan and customer.
//
// These are ESTIMATES for margin tracking, not the provider's invoice: list prices as of
// 2026-09, rounded, applied to the settings each route actually uses. Prices change; when
// the OpenAI or Runway price list moves (or a route changes model, size or quality), update
// the numbers here. The admin pages say "estimated" for the same reason.

type ImageQuality = "low" | "medium" | "high";
type ImageShape = "square" | "portrait";

// gpt-image-1, output price per image at 1024x1024 (square) and 1024x1536 (portrait).
// The prompt's text tokens add a fraction of a cent, ignored.
const GPT_IMAGE_1_USD: Record<ImageQuality, Record<ImageShape, number>> = {
  low: { square: 0.011, portrait: 0.016 },
  medium: { square: 0.042, portrait: 0.063 },
  high: { square: 0.167, portrait: 0.25 },
};

// Runway gen4.5 video: the figure video credits are sized on (supabase/seed.sql), 1 credit = 1 second.
export const RUNWAY_VIDEO_USD_PER_SECOND = 0.12;

// Runway gen4_image at 1080:1440 = 8 Runway credits at US$0.01.
const RUNWAY_IMAGE_USD = 0.08;

// Poster templates: gpt-image-1 image edit at 1024x1536 medium (0.063) plus the input
// images (template, logo, extras) at high input fidelity. Rough on purpose.
const POSTER_USD = 0.1;

// Short gpt-4.1-mini text calls (US$0.40 per million input tokens, US$1.60 per million
// output tokens) at each route's max_tokens. A fraction of a cent each, so a flat guess.
const TEXT_USD = {
  post_caption: 0.001,
  spiritual_chat: 0.001,
  message_outline: 0.003,
} as const;

const round = (value: number) => Math.round(value * 10000) / 10000;

export function bibleArtCostUsd(quality: ImageQuality, format: "square" | "story"): number {
  return GPT_IMAGE_1_USD[quality][format === "square" ? "square" : "portrait"];
}

export function posterCostUsd(): number {
  return POSTER_USD;
}

export function eventFlyerCostUsd(): number {
  return RUNWAY_IMAGE_USD;
}

export function videoCostUsd(durationSeconds: number): number {
  return round(durationSeconds * RUNWAY_VIDEO_USD_PER_SECOND);
}

export function textCostUsd(feature: keyof typeof TEXT_USD): number {
  return TEXT_USD[feature];
}
