import { cn } from "@/lib/utils";
import type { PlanCode, SubscriptionStatus } from "@/lib/types/database.types";

const PLAN_LABEL: Record<PlanCode, string> = {
  starter: "Starter",
  church_pro: "Pro",
};

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  trialing: "bg-accent-soft text-accent",
  active: "bg-accent-soft text-accent",
  past_due: "bg-warning/15 text-warning",
  canceled: "bg-surface-raised text-muted",
  unpaid: "bg-danger/15 text-danger",
};

export function PlanBadge({
  planCode,
  status,
}: {
  planCode: PlanCode;
  status: SubscriptionStatus;
}) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[status])}>
      {PLAN_LABEL[planCode]} · {status === "trialing" ? "trial" : status.replace("_", " ")}
    </span>
  );
}
