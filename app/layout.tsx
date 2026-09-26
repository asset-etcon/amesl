import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

/**
 * Resolves the canonical origin. `metadataBase` is what makes relative URLs in
 * `openGraph.images` and the sitemap resolve to absolute ones, and Next warns at
 * build time without it. Never fall back to localhost: a build with SITE_URL
 * unset would otherwise emit `http://localhost:3000` into every canonical tag.
 */
const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // `default` is used by any route that sets no title of its own; `template`
  // appends the brand to every child route's title. Child pages therefore supply
  // a bare title ("Services") and must NOT also hardcode the brand, or the
  // rendered title becomes "Services | Asset Matrix Energy | Asset Matrix Energy".
  title: {
    default: "Asset Matrix Energy | Engineering, Reliability & Technical Solutions",
    template: "%s | Asset Matrix Energy",
  },
  description:
    "Asset Matrix Energy provides industrial reliability, condition monitoring, testing, diagnostics, instrumentation and technical engineering solutions across Nigeria and Sub-Saharan Africa.",
  applicationName: "Asset Matrix Energy",
  keywords: [
    "asset matrix energy",
    "condition monitoring",
    "predictive maintenance",
    "reliability engineering",
    "industrial testing",
    "instrumentation",
    "Nigeria engineering services",
  ],
  authors: [{ name: "Asset Matrix Energy" }],
  creator: "Asset Matrix Energy",
  publisher: "Asset Matrix Energy",
  // NOTE: no `alternates.canonical` and no `openGraph.url` here. Both are
  // page-specific, and Next merges root metadata into every child route — a
  // canonical of "/" in the layout would declare /about, /services and the rest
  // to be duplicates of the homepage, and og:url would point at "/" sitewide.
  // Each page sets its own.
  openGraph: {
    type: "website",
    siteName: "Asset Matrix Energy",
    locale: "en_GB",
    title: "Asset Matrix Energy | Engineering, Reliability & Technical Solutions",
    description:
      "Industrial reliability, condition monitoring, testing, diagnostics, instrumentation and technical engineering solutions across Nigeria and Sub-Saharan Africa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Asset Matrix Energy | Engineering, Reliability & Technical Solutions",
    description:
      "Industrial reliability, condition monitoring, testing, diagnostics, instrumentation and technical engineering solutions.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: { icon: "/fav.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b3b2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
