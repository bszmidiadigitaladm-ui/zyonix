import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-11 w-11 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
} as const;

const ICON_PIXELS = { sm: 15, md: 20, lg: 26 } as const;

export function IconBox({
  icon: Icon,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-accent-soft text-accent shadow-[0_0_24px_-10px_var(--accent)]",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <Icon size={ICON_PIXELS[size]} strokeWidth={2} />
    </div>
  );
}
