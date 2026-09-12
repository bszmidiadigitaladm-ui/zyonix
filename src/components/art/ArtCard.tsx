import type { BibleArtGeneration } from "@/lib/types/database.types";

export function ArtCard({ generation }: { generation: BibleArtGeneration }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={generation.thumbnail_url ?? generation.image_url} alt="" className="aspect-square w-full object-cover" />
      <div className="flex items-center justify-between p-2 text-xs text-neutral-500">
        <span className="truncate">{generation.verse_reference ?? generation.theme ?? "Bible art"}</span>
        <a href={generation.image_url} download className="font-medium underline">
          Download
        </a>
      </div>
    </div>
  );
}
