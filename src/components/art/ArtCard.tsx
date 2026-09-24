"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BibleArtGeneration } from "@/lib/types/database.types";

export function ArtCard({ generation }: { generation: BibleArtGeneration }) {
  const t = useTranslations("art");
  const label = generation.verse_reference ?? generation.theme ?? t("fallbackLabel");
  const imageUrl = generation.thumbnail_url ?? generation.image_url;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {generation.status === "pending" || !imageUrl ? (
        <div className="flex aspect-square w-full animate-pulse items-center justify-center bg-surface-raised text-xs text-muted">
          {t("galleryPending")}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="aspect-square w-full object-cover" />
      )}
      <div className="flex flex-col gap-1 p-2 text-xs text-muted">
        <span className="truncate">{label}</span>
        {generation.status === "completed" && generation.image_url && (
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href={`/posts?art=${generation.id}`} className="font-medium text-accent hover:underline">
              {t("makePost")}
            </Link>
            <Link href={`/art?variation=${generation.id}`} className="font-medium text-accent hover:underline">
              {t("createVariation")}
            </Link>
            <a href={generation.image_url} download className="font-medium text-accent hover:underline">
              {t("download")}
            </a>
          </span>
        )}
      </div>
    </div>
  );
}
