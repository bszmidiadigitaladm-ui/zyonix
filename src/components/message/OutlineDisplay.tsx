"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import type { MessageOutline } from "@/lib/openai/text";

export function OutlineDisplay({ outline }: { outline: MessageOutline }) {
  const t = useTranslations("message");

  return (
    <Card>
      <h2 className="mb-3 text-xl font-semibold">{outline.title}</h2>

      <p className="mb-4 text-sm leading-relaxed text-foreground/90">{outline.introduction}</p>

      <div className="flex flex-col gap-4">
        {outline.points.map((point, i) => (
          <div key={i} className="border-l-2 border-accent/40 pl-3">
            <h3 className="text-sm font-semibold">
              {i + 1}. {point.heading}
            </h3>
            <p className="mt-1 text-sm text-foreground/90">{point.content}</p>
            {point.verses.length > 0 && (
              <p className="mt-1 text-xs italic text-accent">{point.verses.join(" · ")}</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{outline.closing}</p>

      {outline.suggestedVerses.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("suggestedVerses")}
          </p>
          <p className="mt-1 text-sm text-accent">{outline.suggestedVerses.join(" · ")}</p>
        </div>
      )}
    </Card>
  );
}
