import { cn } from "@/lib/utils";
import type { PosterFormat } from "@/lib/posters/client";

const ASPECT: Record<PosterFormat, string> = {
  feed: "aspect-[4/5]",
  story: "aspect-[9/16]",
};

/**
 * Shows a generated poster in its format. The image is 2:3, so `object-cover`
 * trims the top and bottom evenly for a feed post (4:5) and the sides for a
 * Story (9:16), which matches how each was composed.
 */
export function PosterImage({
  src,
  format = "feed",
  className,
}: {
  src: string;
  format?: PosterFormat;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg bg-surface-raised", ASPECT[format], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
    </div>
  );
}
