"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { BibleBookRow } from "@/lib/types/database.types";

const TRANSLATIONS_BY_LANG: Record<string, { code: string; label: string }[]> = {
  en: [
    { code: "web", label: "World English Bible" },
    { code: "kjv", label: "King James Version" },
  ],
  es: [{ code: "rva1909", label: "Reina-Valera 1909" }],
};

export function BookGrid({ books, locale }: { books: BibleBookRow[]; locale: string }) {
  const t = useTranslations("bible");
  const tBooks = useTranslations("bible.books");
  const translations = TRANSLATIONS_BY_LANG[locale] ?? TRANSLATIONS_BY_LANG.en;
  const [translation, setTranslation] = useState(translations[0].code);
  const [testament, setTestament] = useState<"ot" | "nt">("ot");

  const filtered = books.filter((b) => b.testament === testament).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTestament("ot")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              testament === "ot" ? "bg-accent text-accent-foreground" : "border border-border text-muted",
            )}
          >
            {t("oldTestament")}
          </button>
          <button
            onClick={() => setTestament("nt")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              testament === "nt" ? "bg-accent text-accent-foreground" : "border border-border text-muted",
            )}
          >
            {t("newTestament")}
          </button>
        </div>
        <Select value={translation} onChange={(e) => setTranslation(e.target.value)} className="w-auto">
          {translations.map((tr) => (
            <option key={tr.code} value={tr.code}>
              {tr.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((book) => (
          <Link
            key={book.code}
            href={`/bible/${book.code}/1?translation=${translation}`}
            className="rounded-lg border border-border p-3 transition hover:border-accent/50 hover:bg-surface-raised"
          >
            <p className="text-sm font-semibold">{tBooks(book.code)}</p>
            <p className="text-xs text-muted">{t("chapters", { count: book.chapter_count })}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
