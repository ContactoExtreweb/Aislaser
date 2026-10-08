import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/company";
import { services } from "@/content/services";
import { getProjects } from "@/lib/obras";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const projects = await getProjects();
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
