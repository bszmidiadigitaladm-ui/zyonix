import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locales";

/** Picks the first browser-preferred language (Accept-Language) we support. */
function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const candidates = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .map((tag) => tag.split("-")[0]);

  for (const tag of candidates) {
    if (isLocale(tag)) return tag;
  }
  return null;
}

// No [locale] URL segment — this is a SaaS app, not a content site with
// per-locale SEO needs, so locale is resolved purely server-side: an explicit
// cookie (set by the language switcher) wins, otherwise we fall back to the
// visitor's browser language (Accept-Language, sent on every request), and
// finally to English. This intentionally does NOT use IP geolocation — a
// browser's language setting reflects what the visitor actually reads,
// whereas IP-to-country only tells you where they are, which is a materially
// worse signal for language (e.g. a Brazilian browsing in English).
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = DEFAULT_LOCALE;
  if (cookieLocale && isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerList = await headers();
    locale = localeFromAcceptLanguage(headerList.get("accept-language")) ?? DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
