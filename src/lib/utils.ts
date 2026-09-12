import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Kept as a plain (non-component) function deliberately: eslint's react-hooks
 * purity rule flags a direct `Date.now()` call inside a component/page body,
 * even a Server Component that only ever runs once per request.
 */
export function isPast(dateString: string): boolean {
  return new Date(dateString).getTime() < Date.now();
}
