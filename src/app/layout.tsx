import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { APP_NAME, SITE_URL } from "@/lib/config";
import { TrackingConsent } from "@/components/analytics/TrackingConsent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Create Bible art, devotionals, social posts and sermon outlines in minutes — an AI studio built for Christian creators and churches.";

// The Open Graph image comes from src/app/opengraph-image.png (file convention).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME} — Your faith. Infinite possibilities.`, template: `%s | ${APP_NAME}` },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — Your faith. Infinite possibilities.`,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Your faith. Infinite possibilities.`,
    description: DESCRIPTION,
  },
  // Proves to Meta Business Manager that we own zyonix.pro (needed for ad
  // conversion tracking). Public by design; must stay in the server-rendered <head>.
  other: { "facebook-domain-verification": "t48805p1ykqiba8aczk9ae0yndc2ec" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <TrackingConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
