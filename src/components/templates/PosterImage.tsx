import { cn } from "@/lib/utils";

/**
 * Shows a generated poster at 4:5. The image is 2:3, so `object-cover` trims the
 * top and bottom evenly, which is exactly the padding the poster was given.
 */
export function PosterImage({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface-raised", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
    </div>
  );
}
