"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABEL, type Locale } from "@/i18n/locales";
import { Select } from "@/components/ui/Input";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();

  function handleChange(next: string) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <Select
      aria-label={t("label")}
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
    >
      {LOCALES.map((l: Locale) => (
        <option key={l} value={l}>
          {LOCALE_LABEL[l]}
        </option>
      ))}
    </Select>
  );
}
