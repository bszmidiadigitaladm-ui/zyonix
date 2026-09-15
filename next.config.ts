import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No page here is meant to be framed by another site — blocks clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from guessing content types away from what we declare.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Full URL only ever sent to our own origin; other origins get just the scheme+host.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
