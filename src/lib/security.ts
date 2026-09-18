import { createHash, timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison. Both sides are hashed first so the inputs
 * always have equal length (timingSafeEqual throws otherwise) and comparison
 * time doesn't leak how many leading characters matched.
 */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Auth check for the cron endpoints. Fails closed when CRON_SECRET isn't
 * configured — a plain `header !== \`Bearer ${process.env.CRON_SECRET}\``
 * comparison would otherwise accept the literal header "Bearer undefined".
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header) return false;
  return safeEqual(header, `Bearer ${secret}`);
}
