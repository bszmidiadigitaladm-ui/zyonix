import { CHAT_DISCLAIMER } from "@/lib/safety/crisis-resources";

export function DisclaimerBanner() {
  return (
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      {CHAT_DISCLAIMER}
    </div>
  );
}
