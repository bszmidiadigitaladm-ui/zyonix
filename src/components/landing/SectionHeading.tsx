import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Shared heading for landing sections: eyebrow label, a two-tone title (plain
 * lead + gradient accent) and an optional subtitle.
 */
export function SectionHeading({
  eyebrow,
  lead,
  accent,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  lead: string;
  accent?: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" ? "items-center text-center" : "items-start", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        {lead}
        {accent && (
          <>
            {" "}
            <span className="bg-[image:var(--gradient-accent)] bg-clip-text text-transparent">{accent}</span>
          </>
        )}
      </h2>
      {subtitle && <p className="max-w-xl text-balance text-sm text-muted sm:text-base">{subtitle}</p>}
    </div>
  );
}
