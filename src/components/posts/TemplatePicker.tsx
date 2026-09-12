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
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {templates.map((t) => {
        const locked = t.is_exclusive && !allowExclusive;
        return (
          <button
            key={t.id}
            type="button"
            disabled={locked}
            onClick={() => onSelect(t)}
            className={cn(
              "relative overflow-hidden rounded-lg border text-left",
              selectedId === t.id ? "border-accent" : "border-border",
              locked && "opacity-40",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.preview_url} alt={t.name} className="aspect-square w-full object-cover" />
            {locked && (
              <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                Upgrade
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
