import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BibleTabNav } from "@/components/bible/BibleTabNav";
import { PlanStartButton } from "@/components/bible/PlanStartButton";
import { Card } from "@/components/ui/Card";

export default async function BiblePlansPage() {
  const { user } = await requireOnboardedUser();
  const t = await getTranslations("bible");
  const supabase = await createClient();

  const [{ data: plans }, { data: userPlans }] = await Promise.all([
    supabase.from("reading_plans").select("*").order("sort_order"),
    supabase.from("user_reading_plans").select("plan_id").eq("user_id", user.id),
  ]);

  const startedPlanIds = new Set((userPlans ?? []).map((p) => p.plan_id));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold">{t("plansTitle")}</h1>
      <BibleTabNav />
      <p className="mb-6 text-sm text-muted">{t("plansSubtitle")}</p>

      <div className="flex flex-col gap-4">
        {(plans ?? []).map((plan) => (
          <Card key={plan.id} className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{t(`plans.${plan.id}.title`)}</h2>
              <p className="mt-1 text-sm text-muted">{t(`plans.${plan.id}.description`)}</p>
            </div>
            <PlanStartButton planId={plan.id} started={startedPlanIds.has(plan.id)} />
          </Card>
        ))}
      </div>
    </div>
  );
}
