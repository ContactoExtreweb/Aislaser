"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { sectors } from "@/content/projects";
import { services } from "@/content/services";
import { OBRAS_TAG } from "@/lib/obras";
import { OBRA_LIMITS, slugify } from "@/lib/obras-shared";
import { GALLERY_BUCKET } from "@/lib/supabase/env";
import { requireAdminClient } from "@/lib/supabase/server";

// Obras de la web (como la galería de IMTEX): se gestionan aquí y la web enseña sólo lo publicado.
// Cada cambio invalida la caché de las páginas con obras para que se vea al momento.

export type ObraResult = { error?: string; ok?: string };

const MISSING_TABLE = "Falta preparar la base de datos: ejecuta en Supabase el archivo supabase/migrations/004_galeria_web.sql.";

function dbError(prefix: string, error: { code?: string; message: string }) {
  if (error.code === "PGRST205" || error.code === "42P01") return MISSING_TABLE;
  if (error.code === "42501") return `${prefix}: no tienes permiso. Vuelve a entrar en el panel.`;
  if (error.code === "23514") return `${prefix}: para que salga en la web hacen falta el sector y al menos una foto.`;
  return `${prefix}: ${error.message}`;
}

/** La web (inicio, obras, servicios, sitemap) y el propio panel vuelven a leer las obras */
function refreshSite() {
  updateTag(OBRAS_TAG);
  revalidatePath("/panel/obras", "layout");
}

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

/** Borra del bucket todo lo que haya en la carpeta de una obra (también fotos que se quedaran sin fila) */
async function removeObraFiles(supabase: SupabaseClient, obraId: string) {
  const bucket = supabase.storage.from(GALLERY_BUCKET);
  const { data: files } = await bucket.list(obraId, { limit: 1000 });
  const paths = (files ?? []).filter((f) => f.id).map((f) => `${obraId}/${f.name}`);
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
}

/* ------------------------------- Obras ------------------------------- */

export async function createObra(_prev: ObraResult, formData: FormData): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const titulo = text(formData, "titulo", OBRA_LIMITS.titulo);
  if (!titulo) return { error: "Escribe el nombre de la obra." };

  // La dirección en la web sale del título y no se repite: piscina-de-cordoba, piscina-de-cordoba-2…
  const base = slugify(titulo) || "obra";
  const [{ data: used, error: usedError }, { data: first }] = await Promise.all([
    supabase.from("web_obras").select("slug").like("slug", `${base}%`),
    supabase.from("web_obras").select("orden").order("orden").limit(1).maybeSingle(),
  ]);
  if (usedError) return { error: dbError("No se pudo crear la obra", usedError) };
  const taken = new Set((used ?? []).map((u) => u.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  // Las nuevas salen las primeras en la web
  const orden = (first?.orden ?? 0) - 10;
  const { data, error } = await supabase.from("web_obras").insert({ slug, titulo, orden }).select("id").single();
  if (error || !data) return { error: error ? dbError("No se pudo crear la obra", error) : "No se pudo crear la obra." };
  refreshSite();
  redirect(`/panel/obras/${data.id}`);
}

/**
 * Guarda los datos de la obra. intent: «save» mantiene el estado, «publish» la publica y
 * «unpublish» la deja en borrador (deja de verse en la web).
 */
export async function saveObra(id: string, formData: FormData): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const intent = String(formData.get("intent") ?? "save");

  const { data: current, error: readError } = await supabase
    .from("web_obras")
    .select("publicada, web_fotos(count)")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { error: dbError("No se pudo guardar", readError) };
  if (!current) return { error: "Esta obra ya no existe." };

  const titulo = text(formData, "titulo", OBRA_LIMITS.titulo);
  if (!titulo) return { error: "La obra necesita un nombre." };
  const sectorValue = String(formData.get("sector") ?? "");
  const sector = sectorValue in sectors ? sectorValue : null;
  const validServices = new Set(services.map((s) => s.slug));
  const servicios = [...new Set(formData.getAll("servicios").map(String))].filter((s) => validServices.has(s));
  const publicada = intent === "publish" ? true : intent === "unpublish" ? false : current.publicada;
  const photos = (current.web_fotos as { count: number }[])[0]?.count ?? 0;

  if (publicada && (!sector || photos === 0)) {
    const missing = [!sector && "elegir el sector", photos === 0 && "subir al menos una foto"].filter(Boolean).join(" y ");
    return { error: `Para que salga en la web falta ${missing}.` };
  }

  const { data, error } = await supabase
    .from("web_obras")
    .update({
      titulo,
      sector,
      servicios,
      ubicacion: text(formData, "ubicacion", OBRA_LIMITS.ubicacion),
      anio: text(formData, "anio", OBRA_LIMITS.anio),
      resumen: text(formData, "resumen", OBRA_LIMITS.resumen),
      descripcion: text(formData, "descripcion", OBRA_LIMITS.descripcion),
      destacada: formData.get("destacada") === "on",
      publicada,
    })
    .eq("id", id)
    .select("id");
  if (error) return { error: dbError("No se pudo guardar", error) };
  if (!data?.length) return { error: "No se pudo guardar: la obra ya no existe o no tienes permiso." };

  refreshSite();
  if (intent === "publish" && !current.publicada) return { ok: "¡Publicada! Ya se ve en la web." };
  if (intent === "unpublish" && current.publicada) return { ok: "Quitada de la web. Queda guardada como borrador." };
  return { ok: publicada ? "Cambios guardados y actualizados en la web." : "Borrador guardado (todavía no se ve en la web)." };
}

export async function deleteObra(id: string): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase.from("web_obras").delete().eq("id", id).select("id");
  if (error) return { error: dbError("No se pudo eliminar", error) };
  if (!data?.length) return { error: "No se pudo eliminar: la obra ya no existe o no tienes permiso." };
  // Primero la fila (sus fotos, en cascada) y luego los archivos: la web nunca enlaza una foto borrada
  await removeObraFiles(supabase, id);
  refreshSite();
  redirect("/panel/obras");
}

/** Sube o baja una obra en el orden de la web */
export async function moveObra(id: string, direction: -1 | 1): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase.from("web_obras").select("id").order("orden").order("created_at", { ascending: false });
  if (error) return { error: dbError("No se pudo cambiar el orden", error) };
  const ids = (data ?? []).map((r) => r.id as string);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return {};
  [ids[from], ids[to]] = [ids[to], ids[from]];
  const results = await Promise.all(ids.map((obraId, i) => supabase.from("web_obras").update({ orden: i * 10 }).eq("id", obraId)));
  const failed = results.find((r) => r.error)?.error;
  refreshSite();
  return failed ? { error: dbError("No se pudo cambiar el orden", failed) } : {};
}

/* ------------------------------- Fotos ------------------------------- */

/** Registra una foto que el navegador ya ha subido al bucket (en la carpeta de la obra) */
export async function addObraPhoto(obraId: string, path: string, width: number, height: number): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const validPath = new RegExp(`^${obraId.replace(/[^0-9a-f-]/gi, "")}/[0-9a-f-]{36}\\.(jpg|webp)$`).test(path);
  const validSize = [width, height].every((n) => Number.isInteger(n) && n > 0 && n < 20000);
  if (!validPath || !validSize) return { error: "Foto no válida." };

  const { data: last } = await supabase
    .from("web_fotos")
    .select("orden")
    .eq("obra_id", obraId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("web_fotos")
    .insert({ obra_id: obraId, storage_path: path, ancho: width, alto: height, orden: (last?.orden ?? -1) + 1 });
  if (error) {
    await supabase.storage.from(GALLERY_BUCKET).remove([path]); // no dejar archivos sin su fila
    return { error: dbError("No se pudo guardar la foto", error) };
  }
  refreshSite();
  return {};
}

export async function deleteObraPhoto(photoId: string): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const { data: photo, error: readError } = await supabase
    .from("web_fotos")
    .select("id, obra_id, storage_path, web_obras(publicada, web_fotos(count))")
    .eq("id", photoId)
    .maybeSingle();
  if (readError) return { error: dbError("No se pudo borrar la foto", readError) };
  if (!photo) return {};
  const obra = photo.web_obras as unknown as { publicada: boolean; web_fotos: { count: number }[] } | null;
  if (obra?.publicada && (obra.web_fotos[0]?.count ?? 0) <= 1) {
    return { error: "Es la única foto de una obra publicada. Sube otra antes o quita la obra de la web." };
  }
  const { error } = await supabase.from("web_fotos").delete().eq("id", photoId);
  if (error) return { error: dbError("No se pudo borrar la foto", error) };
  await supabase.storage.from(GALLERY_BUCKET).remove([photo.storage_path]);
  refreshSite();
  return {};
}

/** Guarda el orden de las fotos; la primera es la portada */
export async function reorderObraPhotos(obraId: string, ids: string[]): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase.from("web_fotos").select("id").eq("obra_id", obraId);
  if (error) return { error: dbError("No se pudo cambiar el orden", error) };
  const current = new Set((data ?? []).map((r) => r.id as string));
  if (ids.length !== current.size || !ids.every((id) => current.has(id))) {
    return { error: "Las fotos han cambiado mientras tanto. Recarga la página e inténtalo otra vez." };
  }
  const results = await Promise.all(ids.map((id, i) => supabase.from("web_fotos").update({ orden: i }).eq("id", id)));
  const failed = results.find((r) => r.error)?.error;
  refreshSite();
  return failed ? { error: dbError("No se pudo cambiar el orden", failed) } : {};
}

export async function updateObraPhotoAlt(photoId: string, alt: string): Promise<ObraResult> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("web_fotos")
    .update({ alt: String(alt).trim().slice(0, OBRA_LIMITS.alt) })
    .eq("id", photoId);
  if (error) return { error: dbError("No se pudo guardar la descripción de la foto", error) };
  refreshSite();
  return {};
}
