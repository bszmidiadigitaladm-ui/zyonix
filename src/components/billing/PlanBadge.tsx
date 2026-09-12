import { cn } from "@/lib/utils";
import type { PlanCode, SubscriptionStatus } from "@/lib/types/database.types";

const PLAN_LABEL: Record<PlanCode, string> = {
  starter: "Starter",
  creator: "Creator",
  church_pro: "Church Pro",
};

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  trialing: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  canceled: "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function PlanBadge({
  planCode,
  status,
}: {
  planCode: PlanCode;
  status: SubscriptionStatus;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLE[status],
      )}
    >
      {PLAN_LABEL[planCode]} · {status === "trialing" ? "trial" : status.replace("_", " ")}
    </span>
  );
}
