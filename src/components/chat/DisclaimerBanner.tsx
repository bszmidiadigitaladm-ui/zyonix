import { CHAT_DISCLAIMER } from "@/lib/safety/crisis-resources";

export function DisclaimerBanner() {
  return (
    <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
      {CHAT_DISCLAIMER}
    </div>
  );
}
