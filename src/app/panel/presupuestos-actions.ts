"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { services } from "@/content/services";
import { getAdminClientOrNull } from "@/lib/supabase/server";

export type QuoteResult = { error?: string };

const MISSING_TABLE = "Falta preparar la base de datos: ejecuta en Supabase el archivo supabase/migrations/005_presupuestos.sql.";
const SESSION_EXPIRED = "Tu sesión ha caducado. Vuelve a entrar en el panel y repite la acción.";

function dbError(prefix: string, error: { code?: string; message: string }) {
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST204" || error.code === "42703") return MISSING_TABLE;
  if (error.code === "42501") return `${prefix}: no tienes permiso. Vuelve a entrar en el panel.`;
  return `${prefix}: ${error.message}`;
}

async function adminOrLogin() {
  const supabase = await getAdminClientOrNull();
  if (!supabase) redirect("/panel/login");
  return supabase;
}

/** Fecha de hoy en España (no en UTC: a las 00:30 de aquí en UTC aún es ayer) */
const todayInSpain = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/** Condiciones por defecto de Ajustes (vacías si aún no existen) */
async function defaultConditions(supabase: SupabaseClient) {
  const { data } = await supabase.from("app_settings").select("condiciones_presupuesto").eq("id", 1).maybeSingle();
  return (data?.condiciones_presupuesto as string | undefined) ?? "";
}

/** Crea el presupuesto con una primera partida vacía y abre el editor */
async function createAndOpen(supabase: SupabaseClient, fields: Record<string, unknown>): Promise<QuoteResult> {
  const { data, error } = await supabase
    .from("presupuestos")
    .insert({ fecha: todayInSpain(), condiciones: await defaultConditions(supabase), ...fields })
    .select("id")
    .single();
  if (error || !data) return { error: error ? dbError("No se pudo crear el presupuesto", error) : "No se pudo crear el presupuesto." };
  const { error: lineError } = await supabase.from("presupuesto_partidas").insert({ presupuesto_id: data.id, orden: 0, cantidad: 1 });
  if (lineError) {
    await supabase.from("presupuestos").delete().eq("id", data.id);
    return { error: dbError("No se pudo crear el presupuesto", lineError) };
  }
  revalidatePath("/panel/presupuestos");
  redirect(`/panel/presupuestos/${data.id}`);
}

export async function createQuote(): Promise<QuoteResult> {
  return createAndOpen(await adminOrLogin(), {});
}

/** Presupuesto a partir de una solicitud de la web: copia los datos de contacto y el mensaje */
export async function createQuoteFromMessage(messageId: string): Promise<QuoteResult> {
  const supabase = await adminOrLogin();
  const { data: msg, error } = await supabase
    .from("contact_messages")
    .select("id, name, email, phone, service, message, created_at")
    .eq("id", messageId)
    .maybeSingle();
  if (error) return { error: dbError("No se pudo leer el mensaje", error) };
  if (!msg) return { error: "Ese mensaje ya no existe." };
  const service = services.find((s) => s.slug === msg.service);
  const received = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "Europe/Madrid" }).format(new Date(msg.created_at));
  await supabase.from("contact_messages").update({ is_read: true }).eq("id", msg.id);
  return createAndOpen(supabase, {
    cliente_nombre: msg.name.slice(0, 200),
    cliente_email: msg.email.slice(0, 200),
    cliente_telefono: msg.phone.slice(0, 40),
    obra: service?.title ?? "",
    notas_internas: `Solicitud recibida por la web el ${received}:\n${msg.message}`.slice(0, 5000),
    mensaje_id: msg.id,
  });
}

export async function duplicateQuote(id: string): Promise<QuoteResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
  const [{ data: src, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("presupuestos").select("*").eq("id", id).maybeSingle(),
    supabase.from("presupuesto_partidas").select("orden, tipo, descripcion, unidad, cantidad, precio").eq("presupuesto_id", id).order("orden"),
  ]);
  if (error || linesError) return { error: dbError("No se pudo leer el original", (error ?? linesError)!) };
  if (!src) return { error: "No se encontró el presupuesto original." };

  // Mismo contenido, pero como borrador nuevo de hoy y con su propio número
  const { data: copy, error: copyError } = await supabase
    .from("presupuestos")
    .insert({
      fecha: todayInSpain(),
      validez_dias: src.validez_dias,
      cliente_nombre: src.cliente_nombre,
      cliente_nif: src.cliente_nif,
      cliente_direccion: src.cliente_direccion,
      cliente_email: src.cliente_email,
      cliente_telefono: src.cliente_telefono,
      atencion: src.atencion,
      obra: src.obra,
      ubicacion: src.ubicacion,
      introduccion: src.introduccion,
      condiciones: src.condiciones,
      notas_internas: src.notas_internas,
      iva: src.iva,
      descuento: src.descuento,
      mostrar_firma: src.mostrar_firma,
    })
    .select("id")
    .single();
  if (copyError || !copy) return { error: copyError ? dbError("No se pudo duplicar", copyError) : "No se pudo duplicar." };
  if (lines?.length) {
    const { error: e } = await supabase.from("presupuesto_partidas").insert(lines.map((l) => ({ ...l, presupuesto_id: copy.id })));
    if (e) {
      // Nada de copias a medias
      await supabase.from("presupuestos").delete().eq("id", copy.id);
      return { error: dbError("No se pudieron copiar las partidas", e) };
    }
  }
  revalidatePath("/panel/presupuestos");
  redirect(`/panel/presupuestos/${copy.id}`);
}

export async function deleteQuote(id: string): Promise<QuoteResult> {
  const supabase = await getAdminClientOrNull();
  if (!supabase) return { error: SESSION_EXPIRED };
  const { error } = await supabase.from("presupuestos").delete().eq("id", id);
  if (error) return { error: dbError("No se pudo eliminar", error) };
  revalidatePath("/panel/presupuestos");
  return {};
}
