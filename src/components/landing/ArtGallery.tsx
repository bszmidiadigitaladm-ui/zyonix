import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "shepherd", src: "/landing/art-shepherd.webp" },
  { key: "water", src: "/landing/art-water.webp" },
  { key: "tomb", src: "/landing/art-tomb.webp" },
  { key: "jonah", src: "/landing/art-jonah.webp" },
] as const;

// Every image here was produced by the Bible Art generator itself (see
// docs/LANDING_ASSETS.md) — this section is proof of output, not stock imagery.
export async function ArtGallery() {
  const t = await getTranslations("landing.gallery");

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow={t("eyebrow")}
        lead={t("titleLead")}
        accent={t("titleAccent")}
        subtitle={t("subtitle")}
        className="mb-14"
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {ITEMS.map(({ key, src }, i) => (
          <figure
            key={key}
            className={cn(
              "group relative aspect-[2/3] overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_30px_60px_-35px_rgba(0,0,0,0.9)]",
              i % 2 === 1 && "lg:translate-y-10",
            )}
          >
            <Image
              src={src}
              alt={`${t(`items.${key}.ref`)} — ${t(`items.${key}.style`)}`}
              fill
              unoptimized
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/90 uppercase backdrop-blur">
              <Image src="/logo-mark.png" alt="" width={12} height={12} />
              {t("badge")}
            </span>
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-16">
              <p className="text-[10px] font-medium tracking-widest text-accent uppercase">
                {t(`items.${key}.ref`)} · {t(`items.${key}.style`)}
              </p>
              <p className="mt-1 text-lg leading-tight font-semibold text-white sm:text-xl">{t(`items.${key}.line`)}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-16 text-center text-xs text-muted lg:mt-20">{t("footnote")}</p>
    </section>
  );
}
