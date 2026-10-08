"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_COOKIE } from "@/lib/auth-constants";
import { DOSSIER_BUCKET } from "@/lib/supabase/env";
import { getAdminSession, getSupabaseServer } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string; email?: string };

const safeNext = (next: unknown) => (typeof next === "string" && next.startsWith("/panel") && !next.startsWith("//") ? next : "/panel");

/** Dirección desde la que se usa el panel (Netlify, dominio final o local); Supabase valida la lista de URLs permitidas */
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}


/* ------------------------------ Acceso ------------------------------ */

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu email y tu contraseña.", email };
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.message === "Invalid login credentials" ? "Email o contraseña incorrectos." : `No se pudo iniciar sesión: ${error.message}`,
      email,
    };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/panel/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribe tu email." };
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/panel/nueva-contrasena`,
  });
  if (error) return { error: `No se pudo enviar el email: ${error.message}` };
  return { ok: "Si el email está registrado, recibirás un enlace para crear una contraseña nueva." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== repeat) return { error: "Las contraseñas no coinciden." };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // Fuera del enlace de recuperación hay que confirmar la contraseña actual
  const cookieStore = await cookies();
  const fromRecovery = cookieStore.get(RECOVERY_COOKIE)?.value === user.id;
  if (!fromRecovery) {
    if (!current) return { error: "Escribe tu contraseña actual." };
    const { error: checkError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (checkError) return { error: "La contraseña actual no es correcta." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `No se pudo cambiar la contraseña: ${error.message}` };
  cookieStore.delete(RECOVERY_COOKIE);
  return { ok: "Contraseña actualizada correctamente." };
}

/* ----------------------------- Dosieres ----------------------------- */

const DEFAULT_SECTIONS = ["Objeto del informe", "Pruebas realizadas", "Conclusiones y propuesta de actuación"];

/** Copia sólo las columnas que existen (por si la migración 002 no se ha ejecutado) */
function pickExisting(row: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]]));
}

/** Fecha de hoy en España (no en UTC: a las 00:30 de aquí en UTC aún es ayer) */
const todayInSpain = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/** Borra todos los archivos de un dosier en Storage (portada y fotos), aunque ya no tengan fila */
async function removeDossierFiles(supabase: SupabaseClient, dossierId: string) {
  const bucket = supabase.storage.from(DOSSIER_BUCKET);
  const { data: folders } = await bucket.list(dossierId, { limit: 1000 });
  const paths: string[] = [];
  for (const entry of folders ?? []) {
    if (entry.id) {
      paths.push(`${dossierId}/${entry.name}`);
      continue;
    }
    const { data: files } = await bucket.list(`${dossierId}/${entry.name}`, { limit: 1000 });
    (files ?? []).forEach((f) => paths.push(`${dossierId}/${entry.name}/${f.name}`));
  }
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
}

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.user || !session.isAdmin) redirect("/panel/login");
  return session.supabase;
}

export async function createDossier() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("dossiers")
    .insert({ title: "", work_date: todayInSpain() })
    .select("id")
    .single();
  if (error || !data) throw new Error(`No se pudo crear el informe: ${error?.message ?? "sin respuesta"}`);
  // Empieza con los apartados habituales de un informe de Aislaser, listos para escribir
  const { error: pointsError } = await supabase
    .from("dossier_points")
    .insert(DEFAULT_SECTIONS.map((title, position) => ({ dossier_id: data.id, position, title })));
  if (pointsError) {
    await supabase.from("dossiers").delete().eq("id", data.id);
    throw new Error(`No se pudo crear el informe: ${pointsError.message}`);
  }
  redirect(`/panel/dosieres/${data.id}`);
}

export type ActionResult = { error?: string };

export async function deleteDossier(id: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("dossiers").delete().eq("id", id);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };
  // Todas las fotos de su carpeta, también las que se quedaron sin fila (subidas interrumpidas…)
  await removeDossierFiles(supabase, id);
  revalidatePath("/panel");
  return {};
}

export async function duplicateDossier(id: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { data: src, error } = await supabase.from("dossiers").select("*").eq("id", id).single();
  if (error || !src) return { error: `No se encontró el original: ${error?.message ?? ""}` };
  const [{ data: points, error: pointsError }, { data: images, error: imagesError }] = await Promise.all([
    supabase.from("dossier_points").select("*").eq("dossier_id", id).order("position"),
    supabase.from("dossier_images").select("*").eq("dossier_id", id).order("position"),
  ]);
  if (pointsError || imagesError) return { error: `No se pudo leer el original: ${(pointsError ?? imagesError)!.message}` };

  const { data: copy, error: copyError } = await supabase
    .from("dossiers")
    .insert({
      title: `${src.title} (copia)`,
      subtitle: src.subtitle,
      client_name: src.client_name,
      location: src.location,
      work_date: src.work_date,
      reference: src.reference,
      intro: src.intro,
      status: "borrador",
      ...pickExisting(src, ["template", "attention", "prepared_by", "issue_place", "signer_name", "show_signature"]),
    })
    .select("id")
    .single();
  if (copyError || !copy) return { error: `No se pudo duplicar: ${copyError?.message ?? "sin respuesta"}` };

  const bucket = supabase.storage.from(DOSSIER_BUCKET);
  // Las fotos se copian físicamente para que borrar un dosier no afecte al otro
  const copyFile = async (path: string, folder: string) => {
    const dest = `${copy.id}/${folder}/${crypto.randomUUID()}.jpg`;
    const { error: e } = await bucket.copy(path, dest);
    if (e) throw new Error(`No se pudo copiar una foto: ${e.message}`);
    return dest;
  };

  try {
    if (src.cover_image_path) {
      const dest = await copyFile(src.cover_image_path, "portada");
      const { error: e } = await supabase.from("dossiers").update({ cover_image_path: dest }).eq("id", copy.id);
      if (e) throw new Error(e.message);
    }
    for (const p of points ?? []) {
      const { data: newPoint, error: e } = await supabase
        .from("dossier_points")
        .insert({ dossier_id: copy.id, position: p.position, title: p.title, body: p.body, image_layout: p.image_layout })
        .select("id")
        .single();
      if (e || !newPoint) throw new Error(`No se pudo copiar un apartado: ${e?.message ?? "sin respuesta"}`);
      for (const img of (images ?? []).filter((i) => i.point_id === p.id)) {
        const dest = await copyFile(img.storage_path, newPoint.id);
        const { error: imgError } = await supabase.from("dossier_images").insert({
          dossier_id: copy.id,
          point_id: newPoint.id,
          storage_path: dest,
          caption: img.caption,
          position: img.position,
          width: img.width,
          height: img.height,
        });
        if (imgError) throw new Error(`No se pudo copiar una foto: ${imgError.message}`);
      }
    }
  } catch (e) {
    // Nada de copias a medias: se deshace todo y se avisa
    await supabase.from("dossiers").delete().eq("id", copy.id);
    await removeDossierFiles(supabase, copy.id);
    return { error: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/panel");
  redirect(`/panel/dosieres/${copy.id}`);
}

/* ----------------------------- Mensajes ----------------------------- */

export async function setMessageRead(id: string, isRead: boolean) {
  const supabase = await requireAdmin();
  await supabase.from("contact_messages").update({ is_read: isRead }).eq("id", id);
  revalidatePath("/panel/mensajes");
}

export async function deleteMessage(id: string) {
  const supabase = await requireAdmin();
  await supabase.from("contact_messages").delete().eq("id", id);
  revalidatePath("/panel/mensajes");
}
