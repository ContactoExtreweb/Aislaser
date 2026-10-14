import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Mulish } from "next/font/google";
import { baseOpenGraph, company, siteUrl } from "@/content/company";
import "./globals.css";
import { siteKeywords, siteTitle } from "@/content/seo";

const mulish = Mulish({
  subsets: ["latin"],
  variable: "--font-mulish",
  display: "swap",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: company.description,
  applicationName: "Aislaser",
  keywords: siteKeywords,
  openGraph: {
    ...baseOpenGraph,
    images: [{ url: "/og.jpg?v=30", width: 1200, height: 630, alt: "Aislaser · Impermeabilización con poliurea" }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#242121",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${mulish.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
