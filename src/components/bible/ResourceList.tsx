"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import type { BibleStudyResource } from "@/lib/types/database.types";

const CATEGORIES = ["map", "timeline", "context"] as const;
const CATEGORY_KEY: Record<(typeof CATEGORIES)[number], string> = {
  map: "categoryMap",
  timeline: "categoryTimeline",
  context: "categoryContext",
};

export function ResourceList({ resources }: { resources: BibleStudyResource[] }) {
  const t = useTranslations("bible");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("map");

  const filtered = resources.filter((r) => r.category === category);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              category === c ? "bg-accent text-accent-foreground" : "border border-border text-muted",
            )}
          >
            {t(CATEGORY_KEY[c])}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((r) => (
          <Card key={r.id}>
            <h3 className="font-semibold">{r.title}</h3>
            <p className="mt-1 text-sm text-foreground/90">{r.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
