"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  POSTER_TEMPLATES,
  TEMPLATE_CATEGORIES,
  templateThumbUrl,
  type TemplateCategory,
} from "@/lib/templates/catalog";
import { cn } from "@/lib/utils";

export function TemplateBrowser() {
  const t = useTranslations("templates");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");

  const visible =
    category === "all" ? POSTER_TEMPLATES : POSTER_TEMPLATES.filter((tpl) => tpl.category === category);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(["all", ...TEMPLATE_CATEGORIES] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              category === key ? "border-accent text-accent" : "border-border text-muted hover:text-foreground",
            )}
          >
            {key === "all" ? t("all") : t(`categories.${key}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {visible.map((template) => (
          <Link
            key={template.slug}
            href={`/templates/${template.slug}`}
            className="group overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={templateThumbUrl(template.slug)}
              alt={template.name}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
            <p className="truncate p-2 text-xs font-medium group-hover:text-accent">{template.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
