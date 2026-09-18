import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Only the public marketing/legal/auth entry points are meant to be indexed;
// everything behind login is disallowed so crawlers don't waste requests on redirects.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/terms", "/privacy"],
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/art",
        "/posts",
        "/message",
        "/video",
        "/games",
        "/prayer",
        "/badges",
        "/devotionals",
        "/chat",
        "/templates",
        "/billing",
        "/settings",
        "/team",
        "/bible",
        "/onboarding",
        "/reset-password",
        "/welcome",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
