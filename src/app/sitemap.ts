import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/company";
import { projects } from "@/content/projects";
import { services } from "@/content/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/empresa`, lastModified: now, priority: 0.7 },
    { url: `${siteUrl}/servicios`, lastModified: now, priority: 0.9 },
    ...services.map((s) => ({ url: `${siteUrl}/servicios/${s.slug}`, lastModified: now, priority: 0.8 })),
    { url: `${siteUrl}/obras`, lastModified: now, priority: 0.8 },
    ...projects.map((p) => ({ url: `${siteUrl}/obras/${p.slug}`, lastModified: now, priority: 0.5 })),
    { url: `${siteUrl}/contacto`, lastModified: now, priority: 0.8 },
  ];
}
