"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Verse {
  verse: number;
  text: string;
}

export function ChapterReader({
  bookCode,
  bookName,
  chapter,
  chapterCount,
  translation,
  planId,
  verses,
  initiallyRead,
  initiallyFavorited,
}: {
  bookCode: string;
  bookName: string;
  chapter: number;
  chapterCount: number;
  translation: string;
  planId?: string;
  verses: Verse[];
  initiallyRead: boolean;
  initiallyFavorited: boolean;
}) {
  const t = useTranslations("bible");
  const [read, setRead] = useState(initiallyRead);
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [savingRead, setSavingRead] = useState(false);
  const [savingFav, setSavingFav] = useState(false);

  async function handleMarkAsRead() {
    setSavingRead(true);
    try {
      await fetch("/api/bible/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: bookCode, chapter, plan_id: planId }),
      });
      setRead(true);
    } finally {
      setSavingRead(false);
    }
  }

  async function handleToggleFavorite() {
    setSavingFav(true);
    try {
      const res = await fetch("/api/bible/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: bookCode, chapter, verse: null }),
      });
      const data = await res.json();
      setFavorited(data.favorited);
    } finally {
      setSavingFav(false);
    }
  }

  const suffix = planId ? `?translation=${translation}&plan=${planId}` : `?translation=${translation}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {bookName} {chapter}
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleToggleFavorite} disabled={savingFav}>
            {favorited ? `★ ${t("favorited")}` : `☆ ${t("favorite")}`}
          </Button>
          <Button onClick={handleMarkAsRead} disabled={savingRead || read}>
            {read ? `✓ ${t("read")}` : t("markAsRead")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm leading-relaxed">
        {verses.map((v) => (
          <p key={v.verse}>
            <span className="mr-1 text-xs font-semibold text-accent">{v.verse}</span>
            {v.text}
          </p>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <Link
          href={chapter > 1 ? `/bible/${bookCode}/${chapter - 1}${suffix}` : "#"}
          className={cn(
            "rounded-full border border-border px-4 py-2 text-sm font-medium",
            chapter <= 1 ? "pointer-events-none opacity-30" : "hover:bg-surface-raised",
          )}
        >
          ← {t("previous")}
        </Link>
        <Link
          href={chapter < chapterCount ? `/bible/${bookCode}/${chapter + 1}${suffix}` : "#"}
          className={cn(
            "rounded-full border border-border px-4 py-2 text-sm font-medium",
            chapter >= chapterCount ? "pointer-events-none opacity-30" : "hover:bg-surface-raised",
          )}
        >
          {t("next")} →
        </Link>
      </div>
    </div>
  );
}
