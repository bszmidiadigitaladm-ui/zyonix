import type { Devotional } from "@/lib/types/database.types";
import { parseDateOnly } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export function DevotionalCard({ devotional }: { devotional: Devotional }) {
  return (
    <Card as="article">
      <p className="mb-1 text-xs text-muted">
        {parseDateOnly(devotional.publish_date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h2 className="mb-3 text-xl font-semibold">{devotional.title}</h2>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {devotional.body}
      </div>
      {devotional.scripture_reference && (
        <p className="mt-4 text-sm font-medium italic text-accent">{devotional.scripture_reference}</p>
      )}
    </Card>
  );
}
