import type { SupabaseClient } from "@supabase/supabase-js";
import { DOSSIER_BUCKET, publicImageUrl } from "@/lib/supabase/env";
import type { DossierImage, DossierPoint, DossierRepo } from "./types";

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** Una actualización que no toca ninguna fila no es un éxito: sesión caducada o elemento borrado */
const NOT_SAVED = "No se guardó: la sesión ha caducado o el elemento ya no existe. Recarga la página.";
const expectRows = ({ data, error }: { data: unknown[] | null; error: { message: string } | null }) => {
  fail(error);
  if (!data?.length) throw new Error(NOT_SAVED);
};

export function createSupabaseRepo(supabase: SupabaseClient): DossierRepo {
  const storage = () => supabase.storage.from(DOSSIER_BUCKET);

  async function upload(path: string, blob: Blob) {
    const { error } = await storage().upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    fail(error);
  }

  return {
    async updateDossier(id, patch) {
      expectRows(await supabase.from("dossiers").update(patch).eq("id", id).select("id"));
    },

    async setCover(dossier, blob, size) {
      const path = `${dossier.id}/portada/${crypto.randomUUID()}.jpg`;
      await upload(path, blob);
      try {
        expectRows(await supabase.from("dossiers").update({ cover_image_path: path }).eq("id", dossier.id).select("id"));
      } catch (e) {
        await storage().remove([path]);
        throw e;
      }
      if (dossier.cover_image_path) await storage().remove([dossier.cover_image_path]);
      return { path, url: publicImageUrl(path)!, ...size };
    },

    async removeCover(dossier) {
      expectRows(await supabase.from("dossiers").update({ cover_image_path: null }).eq("id", dossier.id).select("id"));
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
      expectRows(await supabase.from("dossier_points").update(patch).eq("id", id).select("id"));
    },

    async deletePoint(point) {
      // Borrar algo que ya no existe deja el resultado deseado: no es un error
      const { error } = await supabase.from("dossier_points").delete().eq("id", point.id);
      fail(error);
      const paths = point.images.map((i) => i.storage_path);
      if (paths.length) await storage().remove(paths);
    },

    async reorderPoints(items) {
      const results = await Promise.all(
        items.map((it) => supabase.from("dossier_points").update({ position: it.position }).eq("id", it.id).select("id")),
      );
      results.forEach(expectRows);
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
      expectRows(await supabase.from("dossier_images").update(patch).eq("id", id).select("id"));
    },

    async deleteImage(image) {
      const { error } = await supabase.from("dossier_images").delete().eq("id", image.id);
      fail(error);
      await storage().remove([image.storage_path]);
    },

    async reorderImages(items) {
      const results = await Promise.all(
        items.map((it) => supabase.from("dossier_images").update({ position: it.position }).eq("id", it.id).select("id")),
      );
      results.forEach(expectRows);
    },
  };
}
