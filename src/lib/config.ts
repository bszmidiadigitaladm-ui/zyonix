export const APP_NAME = "Faith Studio";

export const PLAN_CODES = ["starter", "creator", "church_pro"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const CREDIT_TYPES = ["image", "text", "video"] as const;
export type CreditType = (typeof CREDIT_TYPES)[number];
