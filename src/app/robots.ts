import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/company";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/auth"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
