import Image from "next/image";
import { cn } from "@/lib/utils";

// Screens are real captures of the app, exported at 1400x926 (see public/landing/app-*.webp).
export const APP_SHOT_WIDTH = 1400;
export const APP_SHOT_HEIGHT = 926;

/** Browser-window chrome around a product screenshot. */
export function AppFrame({
  src,
  alt,
  priority,
  className,
  aspect,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  /** Crop to this width/height ratio (anchored to the top) instead of showing the whole capture. */
  aspect?: number;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_40px_90px_-40px_rgba(45,212,191,0.45)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised/70 px-4 py-2.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 rounded-md bg-background/60 px-3 py-0.5 text-[11px] text-muted">zyonix.pro</span>
      </div>
      {/* Pre-optimized WebP served as-is: no image-CDN function invocations. */}
      {aspect ? (
        <div className="relative" style={{ aspectRatio: String(aspect) }}>
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            priority={priority}
            sizes="(min-width: 1024px) 900px, 100vw"
            className="object-cover object-top"
          />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={APP_SHOT_WIDTH}
          height={APP_SHOT_HEIGHT}
          unoptimized
          priority={priority}
          sizes="(min-width: 1024px) 900px, 100vw"
          className="h-auto w-full"
        />
      )}
    </div>
  );
}
