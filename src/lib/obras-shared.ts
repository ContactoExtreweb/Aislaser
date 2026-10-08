// Tipos y límites de las obras de la web, compartidos por el panel (navegador) y el servidor.
// Los límites son los mismos que los de supabase/migrations/004_galeria_web.sql

export const OBRA_LIMITS = { titulo: 160, ubicacion: 160, anio: 20, resumen: 400, descripcion: 5000, alt: 200 } as const;

export type WebObra = {
  id: string;
  slug: string;
  titulo: string;
  ubicacion: string;
  anio: string;
  sector: string | null;
  servicios: string[];
  resumen: string;
  descripcion: string;
  destacada: boolean;
  publicada: boolean;
  orden: number;
  updated_at: string;
};

export type WebFoto = {
  id: string;
  obra_id: string;
  storage_path: string;
  alt: string;
  ancho: number;
  alto: number;
  orden: number;
};

/** «Piscina de Córdoba (2024)» → «piscina-de-cordoba-2024» */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
