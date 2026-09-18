import type { PlanCode } from "@/lib/config";

type FeatureTranslator = (key: string, values?: Record<string, string | number>) => string;

export interface PlanLimitsForFeatures {
  allow_carousel_export: boolean;
  allow_seasonal_templates: boolean;
  watermark: boolean;
  max_team_seats: number | null;
  image_credits_per_cycle: number;
  text_credits_per_cycle: number;
  video_credits_per_cycle: number;
}

/**
 * Feature bullets for a plan card. Shared by the landing pricing section and
 * the post-signup plan picker so both always describe a plan the same way —
 * including the concrete monthly credit numbers, read straight from plan_limits.
 */
export function featuresFor(code: PlanCode, limits: PlanLimitsForFeatures, t: FeatureTranslator): string[] {
  const list = [limits.watermark ? t("artWatermarked") : t("artNoWatermark")];

  if (limits.image_credits_per_cycle > 0) list.push(t("imageCredits", { count: limits.image_credits_per_cycle }));
  if (limits.text_credits_per_cycle > 0) list.push(t("textCredits", { count: limits.text_credits_per_cycle }));
  if (limits.video_credits_per_cycle > 0) list.push(t("videoCredits", { count: limits.video_credits_per_cycle }));

  list.push(t("dailyDevotional"));
  list.push(code === "starter" ? t("chatLimited") : t("chatUnlimited"));

  if (limits.allow_carousel_export) list.push(t("allFormats"));
  if (limits.allow_seasonal_templates) list.push(t("templateLibrary"));
  if (limits.max_team_seats) list.push(t("teamWorkspace", { seats: limits.max_team_seats }));

  return list;
}
