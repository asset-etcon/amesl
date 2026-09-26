import type { MetadataRoute } from "next";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin area and the auth wall are not content; crawling them wastes
        // crawl budget and can surface internal routes in search results.
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
