"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutTemplate } from "lucide-react";
import { getTemplate } from "@/lib/templates/catalog";
import { downloadPosterPng, toPosterFormat } from "@/lib/posters/client";
import { PosterImage } from "@/components/templates/PosterImage";
import { EmptyState } from "@/components/ui/EmptyState";

interface PosterRow {
  id: string;
  template_slug: string;
  image_url: string | null;
  status: "pending" | "completed" | "failed";
  options: Record<string, string> | null;
}

export function PosterGallery({ posters }: { posters: PosterRow[] }) {
  const t = useTranslations("templates");
  const [failedId, setFailedId] = useState<string | null>(null);

  if (posters.length === 0) {
    return <EmptyState icon={LayoutTemplate} title={t("mineEmpty")} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {posters.map((poster) => {
        const template = getTemplate(poster.template_slug);
        const format = toPosterFormat(poster.options?.format);
        const otherFormat = format === "feed" ? "story" : "feed";
        const ready = poster.status === "completed" && poster.image_url;
        return (
          <div key={poster.id} className="overflow-hidden rounded-lg border border-border bg-surface">
            {ready ? (
              <PosterImage src={poster.image_url!} format={format} className="rounded-none" />
            ) : (
              <div className="flex aspect-[4/5] w-full animate-pulse items-center justify-center bg-surface-raised text-xs text-muted">
                {t("pending")}
              </div>
            )}
            <div className="flex flex-col gap-1 p-2 text-xs text-muted">
              <span className="truncate">
                {template?.name ?? poster.template_slug} · {t(format === "feed" ? "formatFeedShort" : "formatStoryShort")}
              </span>
              {ready && (
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await downloadPosterPng(
                        poster.image_url!,
                        `${poster.template_slug}-${format}.png`,
                        format,
                      );
                      setFailedId(ok ? null : poster.id);
                    }}
                    className="font-medium text-accent hover:underline"
                  >
                    {t("download")}
                  </button>
                  <Link
                    href={`/templates/${poster.template_slug}?from=${poster.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {t("useAgain")}
                  </Link>
                  <Link
                    href={`/templates/${poster.template_slug}?from=${poster.id}&format=${otherFormat}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {t(otherFormat === "story" ? "makeStory" : "makeFeed")}
                  </Link>
                </span>
              )}
              {failedId === poster.id && <span className="text-danger">{t("downloadError")}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
