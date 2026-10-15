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
      // Google News needs to reach the news sitemap and the articles it lists.
      // The rule above already allows both, but it is declared explicitly for
      // NewsBot so the pairing stays obvious if the wildcard rule is ever
      // tightened to block more of the site.
      {
        userAgent: "Googlebot-News",
        allow: ["/", "/news", "/news/"],
      },
    ],
    // Both files: sitemap.xml for the whole catalogue, news-sitemap.xml for the
    // articles. robots.txt `sitemap:` accepts more than one entry.
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/news-sitemap.xml`],
  };
}
