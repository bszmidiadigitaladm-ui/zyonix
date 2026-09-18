import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { isLocale, DEFAULT_LOCALE } from "@/i18n/locales";
import { getTerms } from "@/lib/legal/content";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern your use of Zyonix.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const locale = await getLocale();
  return <LegalDocumentView doc={getTerms(isLocale(locale) ? locale : DEFAULT_LOCALE)} locale={locale} />;
}
