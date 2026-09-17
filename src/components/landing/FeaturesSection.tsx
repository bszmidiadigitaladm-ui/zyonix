import { getTranslations } from "next-intl/server";
import {
  Palette,
  Layers,
  Sunrise,
  MessageCircle,
  Clapperboard,
  Mic,
  BookOpen,
  Gamepad2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconBox } from "@/components/ui/IconBox";

const FEATURES: { key: string; icon: LucideIcon }[] = [
  { key: "bibleArt", icon: Palette },
  { key: "socialPosts", icon: Layers },
  { key: "devotional", icon: Sunrise },
  { key: "spiritualChat", icon: MessageCircle },
  { key: "video", icon: Clapperboard },
  { key: "message", icon: Mic },
  { key: "bible", icon: BookOpen },
  { key: "games", icon: Gamepad2 },
  { key: "church", icon: Users },
];

export async function FeaturesSection() {
  const t = await getTranslations("landing.features");

  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 flex flex-col items-center text-center">
        <Eyebrow className="mb-3">{t("eyebrow")}</Eyebrow>
        <h2 className="mb-2 text-3xl font-semibold sm:text-4xl">{t("title")}</h2>
        <p className="max-w-md text-sm text-muted">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, icon }) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-b from-surface-raised/70 to-surface p-6 transition hover:-translate-y-0.5 hover:border-accent/50"
          >
            <IconBox icon={icon} />
            <h3 className="font-semibold">{t(`${key}.title`)}</h3>
            <p className="text-sm text-muted">{t(`${key}.description`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
