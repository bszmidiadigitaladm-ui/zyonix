"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SeasonalTemplate } from "@/lib/types/database.types";

export function TemplatePicker({
  templates,
  allowExclusive,
  selectedId,
  onSelect,
}: {
  templates: SeasonalTemplate[];
  allowExclusive: boolean;
  selectedId: string | null;
  onSelect: (template: SeasonalTemplate) => void;
}) {
  const t = useTranslations("posts");

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {templates.map((template) => {
        const locked = template.is_exclusive && !allowExclusive;
        return (
          <button
            key={template.id}
            type="button"
            disabled={locked}
            onClick={() => onSelect(template)}
            className={cn(
              "relative overflow-hidden rounded-lg border text-left",
              selectedId === template.id ? "border-accent" : "border-border",
              locked && "opacity-40",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.preview_url}
              alt={template.name}
              className="aspect-square w-full object-cover"
            />
            {locked && (
              <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                {t("upgrade")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
