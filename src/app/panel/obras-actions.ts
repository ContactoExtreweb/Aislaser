"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { sectors } from "@/content/projects";
import { services } from "@/content/services";
import { OBRAS_TAG } from "@/lib/obras";
import { OBRA_LIMITS, slugify } from "@/lib/obras-shared";
import { GALLERY_BUCKET } from "@/lib/supabase/env";
import { getAdminClientOrNull } from "@/lib/supabase/server";

// Obras de la web (como la galería de IMTEX): se gestionan aquí y la web enseña sólo lo publicado.
// Los cambios que afectan a lo publicado invalidan la caché de las páginas con obras para que se
// vean al momento; los de los borradores no tocan la web.

export type ObraResult = { error?: string; ok?: string };

const MISSING_TABLE = "Falta preparar la base de datos: ejecuta en Supabase el archivo supabase/migrations/004_galeria_web.sql.";
/** Sin redirigir al login: así no se pierde lo que se estaba escribiendo */
const SESSION_EXPIRED = "Tu sesión ha caducado. Abre el panel en otra pestaña, vuelve a entrar y repite la acción aquí (lo escrito no se ha perdido).";

function dbError(prefix: string, error: { code?: string; message: string }) {
  if (error.code === "PGRST205" || error.code === "42P01") return MISSING_TABLE;
  if (error.code === "42501") return `${prefix}: no tienes permiso. Vuelve a entrar en el panel.`;
  if (error.code === "23514") return `${prefix}: para que salga en la web hacen falta el sector y al menos una foto.`;
  return `${prefix}: ${error.message}`;
}

/**
 * El panel siempre vuelve a leer las obras; la web (inicio, obras, servicios, sitemap) sólo
 * cuando el cambio afecta a algo publicado. updateTag hace que la siguiente visita espere los
 * datos nuevos: quien acaba de publicar lo ve al momento al abrir la web.
 */
function refresh(publicChange: boolean) {
  if (publicChange) updateTag(OBRAS_TAG);
  revalidatePath("/panel/obras", "layout");
}

/** Los saltos de línea llegan como \r\n: se cuentan como uno, igual que en el navegador */
const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);

/** Borra del bucket todo lo que haya en la carpeta de una obra (también fotos que se quedaran sin fila) */
async function removeObraFiles(supabase: SupabaseClient, obraId: string) {
  const bucket = supabase.storage.from(GALLERY_BUCKET);
  const { data: files } = await bucket.list(obraId, { limit: 1000 });
  const paths = (files ?? []).filter((f) => f.id).map((f) => `${obraId}/${f.name}`);
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
}

/** ¿Está publicada la obra? (para saber si un cambio en sus fotos se ve en la web) */
async function isPublished(supabase: SupabaseClient, obraId: string) {
  const { data } = await supabase.from("web_obras").select("publicada").eq("id", obraId).maybeSingle();
  return Boolean(data?.publicada);
}

/* ------------------------------- Obras ------------------------------- */

export async function createObra(_prev: ObraResult, formData: FormData): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
  const titulo = text(formData, "titulo", OBRA_LIMITS.titulo);
  if (!titulo) return { error: "Escribe el nombre de la obra." };

  // La dirección en la web sale del título y no se repite: piscina-de-cordoba, piscina-de-cordoba-2…
  const base = slugify(titulo) || "obra";
  const { data: first } = await supabase.from("web_obras").select("orden").order("orden").limit(1).maybeSingle();
  // Las nuevas salen las primeras en la web
  const orden = (first?.orden ?? 0) - 10;

  // Si otra persona crea a la vez una obra con el mismo nombre, se reintenta con el siguiente número
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: used, error: usedError } = await supabase.from("web_obras").select("slug").like("slug", `${base}%`);
    if (usedError) return { error: dbError("No se pudo crear la obra", usedError) };
    const taken = new Set((used ?? []).map((u) => u.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

    const { data, error } = await supabase.from("web_obras").insert({ slug, titulo, orden }).select("id").single();
    if (error?.code === "23505") continue;
    if (error || !data) return { error: error ? dbError("No se pudo crear la obra", error) : "No se pudo crear la obra." };
    refresh(false); // un borrador no se ve en la web
    redirect(`/panel/obras/${data.id}`);
  }
  return { error: "No se pudo crear la obra: ya existe otra con ese nombre. Inténtalo otra vez." };
}

/**
 * Guarda los datos de la obra. intent: «save» mantiene el estado, «publish» la publica y
 * «unpublish» la deja en borrador (deja de verse en la web).
 */
export async function saveObra(id: string, formData: FormData): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
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

  refresh(current.publicada || publicada);
  if (intent === "publish" && !current.publicada) return { ok: "¡Publicada! Ya se ve en la web." };
  if (intent === "unpublish" && current.publicada) return { ok: "Quitada de la web. Queda guardada como borrador." };
  return { ok: publicada ? "Cambios guardados y actualizados en la web." : "Borrador guardado (todavía no se ve en la web)." };
}

export async function deleteObra(id: string): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
  const wasPublished = await isPublished(supabase, id);
  const { data, error } = await supabase.from("web_obras").delete().eq("id", id).select("id");
  if (error) return { error: dbError("No se pudo eliminar", error) };
  if (!data?.length) return { error: "No se pudo eliminar: la obra ya no existe o no tienes permiso." };
  // Primero la fila (sus fotos, en cascada) y luego los archivos: la web nunca enlaza una foto borrada
  await removeObraFiles(supabase, id);
  refresh(wasPublished);
  redirect("/panel/obras");
}

/** Sube o baja una obra en el orden de la web */
export async function moveObra(id: string, direction: -1 | 1): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
  const { data, error } = await supabase
    .from("web_obras")
    .select("id, publicada")
    .order("orden")
    .order("created_at", { ascending: false })
    .order("id");
  if (error) return { error: dbError("No se pudo cambiar el orden", error) };
  const rows = data ?? [];
  const from = rows.findIndex((r) => r.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= rows.length) return {};
  const publicChange = rows[from].publicada || rows[to].publicada;
  [rows[from], rows[to]] = [rows[to], rows[from]];
  const results = await Promise.all(rows.map((r, i) => supabase.from("web_obras").update({ orden: i * 10 }).eq("id", r.id)));
  const failed = results.find((r) => r.error)?.error;
  refresh(publicChange);
  return failed ? { error: dbError("No se pudo cambiar el orden", failed) } : {};
}

/* ------------------------------- Fotos ------------------------------- */

/** Registra una foto que el navegador ya ha subido al bucket (en la carpeta de la obra) */
export async function addObraPhoto(obraId: string, path: string, width: number, height: number): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
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
  refresh(await isPublished(supabase, obraId));
  return {};
}

export async function deleteObraPhoto(photoId: string): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
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
  refresh(Boolean(obra?.publicada));
  return {};
}

/** Guarda el orden de las fotos; la primera es la portada */
export async function reorderObraPhotos(obraId: string, ids: string[]): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
  const { data, error } = await supabase.from("web_fotos").select("id").eq("obra_id", obraId);
  if (error) return { error: dbError("No se pudo cambiar el orden", error) };
  const current = new Set((data ?? []).map((r) => r.id as string));
  if (!Array.isArray(ids) || ids.length !== current.size || !ids.every((id) => current.has(id))) {
    return { error: "Las fotos han cambiado mientras tanto. Recarga la página e inténtalo otra vez." };
  }
  const results = await Promise.all(ids.map((id, i) => supabase.from("web_fotos").update({ orden: i }).eq("id", id)));
  const failed = results.find((r) => r.error)?.error;
  refresh(await isPublished(supabase, obraId));
  return failed ? { error: dbError("No se pudo cambiar el orden", failed) } : {};
}

export async function updateObraPhotoAlt(photoId: string, alt: string): Promise<ObraResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
  const { data, error } = await supabase
    .from("web_fotos")
    .update({ alt: String(alt).trim().slice(0, OBRA_LIMITS.alt) })
    .eq("id", photoId)
    .select("obra_id");
  if (error) return { error: dbError("No se pudo guardar la descripción de la foto", error) };
  if (!data?.length) return { error: "No se pudo guardar la descripción: la foto ya no existe." };
  refresh(await isPublished(supabase, data[0].obra_id as string));
  return {};
}
