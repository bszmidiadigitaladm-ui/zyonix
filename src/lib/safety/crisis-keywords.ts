// Fallback layer for the crisis-detection check in src/app/api/ai/chat/route.ts.
// Exists because the OpenAI moderation endpoint can miss context-light short
// messages or be temporarily unavailable — this runs regardless, and either
// layer triggering is enough (deliberately high recall over precision: a false
// positive occasionally interrupts a non-crisis message, a false negative
// misses real risk, and that tradeoff is not close).
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+myself\b/i,
  /\bend(ing)?\s+(my|it all)\b.{0,15}\blife\b/i,
  /\b(want|wanted|wanna)\s+to\s+die\b/i,
  /\bsuicid(e|al)\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive)\b/i,
  /\bself[\s-]?harm(ing)?\b/i,
  /\bhurt(ing)?\s+myself\b/i,
  /\bcut(ting)?\s+myself\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i,
];

export function matchesCrisisKeywords(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}
