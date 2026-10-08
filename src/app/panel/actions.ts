"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DOSSIER_BUCKET } from "@/lib/supabase/env";
import { getAdminSession, getSupabaseServer } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string; email?: string };

const safeNext = (next: unknown) => (typeof next === "string" && next.startsWith("/panel") && !next.startsWith("//") ? next : "/panel");

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${proto}://${host}`;
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
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== repeat) return { error: "Las contraseñas no coinciden." };
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `No se pudo cambiar la contraseña: ${error.message}` };
  return { ok: "Contraseña actualizada correctamente." };
}

/* ----------------------------- Dosieres ----------------------------- */

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.user || !session.isAdmin) redirect("/panel/login");
  return session.supabase;
}

export async function createDossier() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("dossiers")
    .insert({ title: "Nuevo dosier", work_date: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el dosier");
  // Empieza ya con el punto 1 listo para escribir
  await supabase.from("dossier_points").insert({ dossier_id: data.id, position: 0 });
  redirect(`/panel/dosieres/${data.id}`);
}

export async function deleteDossier(id: string) {
  const supabase = await requireAdmin();
  const [{ data: dossier }, { data: images }] = await Promise.all([
    supabase.from("dossiers").select("cover_image_path").eq("id", id).single(),
    supabase.from("dossier_images").select("storage_path").eq("dossier_id", id),
  ]);
  const { error } = await supabase.from("dossiers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const paths = [...(images ?? []).map((i) => i.storage_path), dossier?.cover_image_path].filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(DOSSIER_BUCKET).remove(paths);
  revalidatePath("/panel");
}

export async function duplicateDossier(id: string) {
  const supabase = await requireAdmin();
  const { data: src, error } = await supabase.from("dossiers").select("*").eq("id", id).single();
  if (error || !src) throw new Error(error?.message ?? "Dosier no encontrado");
  const [{ data: points }, { data: images }] = await Promise.all([
    supabase.from("dossier_points").select("*").eq("dossier_id", id).order("position"),
    supabase.from("dossier_images").select("*").eq("dossier_id", id).order("position"),
  ]);

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
    })
    .select("id")
    .single();
  if (copyError || !copy) throw new Error(copyError?.message ?? "No se pudo duplicar");

  const bucket = supabase.storage.from(DOSSIER_BUCKET);
  // Las fotos se copian físicamente para que borrar un dosier no afecte al otro
  const copyFile = async (path: string, folder: string) => {
    const dest = `${copy.id}/${folder}/${crypto.randomUUID()}.jpg`;
    const { error: e } = await bucket.copy(path, dest);
    return e ? null : dest;
  };

  if (src.cover_image_path) {
    const dest = await copyFile(src.cover_image_path, "portada");
    if (dest) await supabase.from("dossiers").update({ cover_image_path: dest }).eq("id", copy.id);
  }

  for (const p of points ?? []) {
    const { data: newPoint } = await supabase
      .from("dossier_points")
      .insert({ dossier_id: copy.id, position: p.position, title: p.title, body: p.body, image_layout: p.image_layout })
      .select("id")
      .single();
    if (!newPoint) continue;
    for (const img of (images ?? []).filter((i) => i.point_id === p.id)) {
      const dest = await copyFile(img.storage_path, newPoint.id);
      if (!dest) continue;
      await supabase.from("dossier_images").insert({
        dossier_id: copy.id,
        point_id: newPoint.id,
        storage_path: dest,
        caption: img.caption,
        position: img.position,
        width: img.width,
        height: img.height,
      });
    }
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
