import {
  Palette,
  Layers,
  Sunrise,
  Mic,
  Clapperboard,
  Flame,
  Zap,
  BookOpen,
  BookMarked,
  Trophy,
  Award,
  type LucideIcon,
} from "lucide-react";

const BADGE_ICONS: Record<string, LucideIcon> = {
  Palette,
  Layers,
  Sunrise,
  Mic,
  Clapperboard,
  Flame,
  Zap,
  BookOpen,
  BookMarked,
  Trophy,
};

/** Maps a badges.icon_key column value to its lucide-react icon, falling back to Award. */
export function getBadgeIcon(iconKey: string): LucideIcon {
  return BADGE_ICONS[iconKey] ?? Award;
}
