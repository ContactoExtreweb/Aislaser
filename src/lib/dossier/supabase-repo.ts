"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DOSSIER_BUCKET, publicImageUrl } from "@/lib/supabase/env";
import type { Dossier, DossierImage, DossierPoint, DossierRepo } from "./types";

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export function createSupabaseRepo(supabase: SupabaseClient): DossierRepo {
  const storage = () => supabase.storage.from(DOSSIER_BUCKET);

  async function upload(path: string, blob: Blob) {
    const { error } = await storage().upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    fail(error);
  }

  return {
    async updateDossier(id, patch) {
      const { error } = await supabase.from("dossiers").update(patch).eq("id", id);
      fail(error);
    },

    async setCover(dossier, blob, size) {
      const path = `${dossier.id}/portada/${crypto.randomUUID()}.jpg`;
      await upload(path, blob);
      const { error } = await supabase.from("dossiers").update({ cover_image_path: path }).eq("id", dossier.id);
      fail(error);
      if (dossier.cover_image_path) await storage().remove([dossier.cover_image_path]);
      return { path, url: publicImageUrl(path)!, ...size };
    },

    async removeCover(dossier) {
      const { error } = await supabase.from("dossiers").update({ cover_image_path: null }).eq("id", dossier.id);
      fail(error);
      if (dossier.cover_image_path) await storage().remove([dossier.cover_image_path]);
    },

    async addPoint(dossierId, position) {
      const { data, error } = await supabase
        .from("dossier_points")
        .insert({ dossier_id: dossierId, position })
        .select("id, dossier_id, position, title, body, image_layout")
        .single();
      fail(error);
      return { ...(data as Omit<DossierPoint, "images">), images: [] };
    },

    async updatePoint(id, patch) {
      const { error } = await supabase.from("dossier_points").update(patch).eq("id", id);
      fail(error);
    },

    async deletePoint(point) {
      const { error } = await supabase.from("dossier_points").delete().eq("id", point.id);
      fail(error);
      const paths = point.images.map((i) => i.storage_path);
      if (paths.length) await storage().remove(paths);
    },

    async reorderPoints(items) {
      const results = await Promise.all(
        items.map((it) => supabase.from("dossier_points").update({ position: it.position }).eq("id", it.id)),
      );
      results.forEach((r) => fail(r.error));
    },

    async addImage(point, blob, size, position) {
      const path = `${point.dossier_id}/${point.id}/${crypto.randomUUID()}.jpg`;
      await upload(path, blob);
      const { data, error } = await supabase
        .from("dossier_images")
        .insert({
          dossier_id: point.dossier_id,
          point_id: point.id,
          storage_path: path,
          position,
          width: size.width,
          height: size.height,
        })
        .select("id, dossier_id, point_id, storage_path, caption, position, width, height")
        .single();
      if (error) {
        await storage().remove([path]);
        fail(error);
      }
      return { ...(data as Omit<DossierImage, "url">), url: publicImageUrl(path)! };
    },

    async updateImage(id, patch) {
      const { error } = await supabase.from("dossier_images").update(patch).eq("id", id);
      fail(error);
    },

    async deleteImage(image) {
      const { error } = await supabase.from("dossier_images").delete().eq("id", image.id);
      fail(error);
      await storage().remove([image.storage_path]);
    },

    async reorderImages(items) {
      const results = await Promise.all(
        items.map((it) => supabase.from("dossier_images").update({ position: it.position }).eq("id", it.id)),
      );
      results.forEach((r) => fail(r.error));
    },
  };
}

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
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        ...p,
        images: images
          .filter((i) => i.point_id === p.id)
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ ...i, url: publicImageUrl(i.storage_path)! })),
      })),
  };
}
