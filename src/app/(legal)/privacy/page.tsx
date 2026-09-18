import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { isLocale, DEFAULT_LOCALE } from "@/i18n/locales";
import { getPrivacy } from "@/lib/legal/content";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Zyonix collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <LegalDocumentView doc={getPrivacy(isLocale(locale) ? locale : DEFAULT_LOCALE)} locale={locale} />;
}
