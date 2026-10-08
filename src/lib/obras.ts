import "server-only";
import { cache } from "react";
import { projects as staticProjects, sectors, type Project, type Sector } from "@/content/projects";
import { services } from "@/content/services";
import { galleryImageUrl, isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

// Obras de la web: se gestionan en el panel (/panel/obras) y aquí sólo se lee lo publicado.
// Se consulta la API de Supabase con la clave publicable: el RLS sólo deja ver las obras
// publicadas y sus fotos.

/** Etiqueta de caché de todo lo que enseña obras: el panel la invalida al guardar */
export const OBRAS_TAG = "obras";
/** Aunque nadie toque el panel, la web vuelve a consultar como mucho cada 5 minutos */
const REVALIDATE_SECONDS = 300;

type Row = {
  slug: string;
  titulo: string;
  ubicacion: string;
  anio: string;
  sector: string | null;
  servicios: string[];
  resumen: string;
  descripcion: string;
  destacada: boolean;
  fotos: { storage_path: string; alt: string; ancho: number; alto: number; orden: number }[];
};

const FIELDS = "slug,titulo,ubicacion,anio,sector,servicios,resumen,descripcion,destacada,fotos:web_fotos(storage_path,alt,ancho,alto,orden)";

function toProject(r: Row): Project {
  return {
    slug: r.slug,
    title: r.titulo,
    location: r.ubicacion,
    sector: r.sector && r.sector in sectors ? (r.sector as Sector) : "tecnicas",
    featured: r.destacada,
    year: r.anio || undefined,
    summary: r.resumen || undefined,
    description: r.descripcion || undefined,
    services: r.servicios,
    // La primera foto por orden es la portada
    images: [...r.fotos]
      .sort((a, b) => a.orden - b.orden || a.storage_path.localeCompare(b.storage_path))
      .map((f) => ({ src: galleryImageUrl(f.storage_path), width: f.ancho, height: f.alto, alt: f.alt || undefined })),
  };
}

/** Las obras de la web anterior: se enseñan mientras la galería de la base de datos no exista o esté vacía */
const fallbackProjects: Project[] = staticProjects.map((p) => ({
  ...p,
  services: services.filter((s) => s.projects.includes(p.slug)).map((s) => s.slug),
}));

/**
 * null si la galería aún no existe (falta la migración 004 o Supabase no está configurado).
 * Cualquier otro fallo lanza un error a propósito: así la web sigue sirviendo la última
 * versión buena (ISR) y un despliegue con Supabase caído falla en vez de publicar algo a medias.
 * Next sólo guarda en caché las respuestas 200, así que un fallo no se queda pegado.
 */
async function fetchPublished(): Promise<Project[] | null> {
  if (!isSupabaseConfigured) return null;
  const res = await fetch(`${supabaseUrl}/rest/v1/web_obras?select=${FIELDS}&publicada=eq.true&order=orden.asc,created_at.desc,id.asc`, {
    headers: { apikey: supabaseKey },
    next: { revalidate: REVALIDATE_SECONDS, tags: [OBRAS_TAG] },
  });
  if (res.status === 404) return null; // PGRST205: la tabla web_obras todavía no existe
  if (!res.ok) throw new Error(`Obras: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as Row[];
  // Una obra sin fotos no se puede enseñar (el panel tampoco deja publicarla así)
  return rows.map(toProject).filter((p) => p.images.length > 0);
}

/** Obras publicadas, en el orden del panel */
export const getProjects = cache(async (): Promise<Project[]> => {
  const fromDb = await fetchPublished();
  return fromDb && fromDb.length > 0 ? fromDb : fallbackProjects;
});

export async function getProject(slug: string) {
  return (await getProjects()).find((p) => p.slug === slug);
}

/** Para la portada: las destacadas en el orden del panel, completando con las siguientes hasta `max` */
export function pickFeatured(projects: Project[], max = 6) {
  return [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)].slice(0, max);
}

/**
 * La descripción se escribe en el panel como texto: párrafos y, si se quiere, una lista
 * de trabajos realizados con una línea por trabajo empezando por «- ».
 */
export function splitDescription(text: string | undefined) {
  const blocks: ({ type: "p"; text: string } | { type: "ul"; items: string[] })[] = [];
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const item = /^[-•*]\s+(.*)$/.exec(line)?.[1];
    const last = blocks.at(-1);
    if (item) {
      if (last?.type === "ul") last.items.push(item);
      else blocks.push({ type: "ul", items: [item] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }
  return blocks;
}
