import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Asset Matrix Energy | Engineering, Reliability & Technical Solutions",
  description: "Asset Matrix Energy provides industrial reliability, condition monitoring, testing, diagnostics, instrumentation and technical engineering solutions across Nigeria and Sub-Saharan Africa.",
  icons: { icon: "/fav.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className={manrope.variable}>{children}</body></html>
  );
}
