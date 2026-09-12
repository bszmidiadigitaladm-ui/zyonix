"use client";

import { useTranslations } from "next-intl";
import type { BibleArtGeneration } from "@/lib/types/database.types";
import { ArtCard } from "@/components/art/ArtCard";

export function ArtGalleryGrid({ generations }: { generations: BibleArtGeneration[] }) {
  const t = useTranslations("art");

  if (generations.length === 0) {
    return <p className="text-sm text-muted">{t("galleryEmpty")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {generations.map((g) => (
        <ArtCard key={g.id} generation={g} />
      ))}
    </div>
  );
}
