import { publicImageUrl } from "@/lib/supabase/env";
import type { Dossier, DossierImage, DossierPoint } from "./types";

// Sin directiva "use client": lo usan las páginas del servidor para preparar los datos del editor

type DossierRow = Omit<Dossier, "points" | "cover_url" | keyof DossierExtras> & Partial<DossierExtras>;
type DossierExtras = Pick<Dossier, "template" | "attention" | "prepared_by" | "issue_place" | "signer_name" | "show_signature">;

/** Valores por defecto de los campos de la migración 002 (por si aún no se ha ejecutado) */
export const DOSSIER_EXTRAS_DEFAULTS: DossierExtras = {
  template: "informe",
  attention: "",
  prepared_by: "TÉCNICOS DE AISLASER",
  issue_place: "Campanario",
  signer_name: "",
  show_signature: true,
};

/** true si la base de datos todavía no tiene los campos de la migración 002 */
export const needsInformeMigration = (row: object) => !("template" in row);

/** Convierte las filas de Supabase en el objeto Dossier que usa el editor */
export function hydrateDossier(
  row: DossierRow,
  points: Omit<DossierPoint, "images">[],
  images: Omit<DossierImage, "url">[],
): Dossier {
  return {
    ...DOSSIER_EXTRAS_DEFAULTS,
    ...row,
    template: row.template === "portada" ? "portada" : "informe",
    cover_url: publicImageUrl(row.cover_image_path),
    points: points
      .slice()
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map((p) => ({
        ...p,
        images: images
          .filter((i) => i.point_id === p.id)
          .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
          .map((i) => ({ ...i, url: publicImageUrl(i.storage_path)! })),
      })),
  };
}
