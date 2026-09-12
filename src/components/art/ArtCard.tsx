import type { BibleArtGeneration } from "@/lib/types/database.types";

export function ArtCard({ generation }: { generation: BibleArtGeneration }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={generation.thumbnail_url ?? generation.image_url} alt="" className="aspect-square w-full object-cover" />
      <div className="flex items-center justify-between p-2 text-xs text-muted">
        <span className="truncate">{generation.verse_reference ?? generation.theme ?? "Bible art"}</span>
        <a href={generation.image_url} download className="font-medium text-accent hover:underline">
          Download
        </a>
      </div>
    </div>
  );
}
