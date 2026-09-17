import type { MetadataRoute } from "next";

/**
 * robots.txt — allow all well-behaved crawlers, point them at the dynamic
 * sitemap (which includes every published blog post via Payload).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api/"],
    },
    sitemap: "https://subscrr.app/sitemap.xml",
  };
}
