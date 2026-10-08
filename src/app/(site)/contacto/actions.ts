"use server";

import { createClient } from "@supabase/supabase-js";
import { SAFE_EMAIL } from "@/lib/email";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export type ContactState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "privacy", string>>;
  /** Lo que escribió el usuario, para no perderlo si hay un error */
  values?: { name: string; phone: string; email: string; service: string; message: string; privacy: boolean };
};

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Campo trampa anti-spam: los humanos no lo ven
  if (clean(formData.get("website"), 200)) return { status: "ok" };

  const name = clean(formData.get("name"), 200);
  const phone = clean(formData.get("phone"), 40);
  const email = clean(formData.get("email"), 200);
  const service = clean(formData.get("service"), 100);
  const message = clean(formData.get("message"), 5000);
  const privacy = formData.get("privacy") === "on";

  const values = { name, phone, email, service, message, privacy };
  const fieldErrors: ContactState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Indica tu nombre";
  if (phone.replace(/\D/g, "").length < 9) fieldErrors.phone = "Indica un teléfono válido";
  if (!SAFE_EMAIL.test(email)) fieldErrors.email = "Indica un email válido";
  if (!privacy) fieldErrors.privacy = "Debes aceptar la política de privacidad";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors, values };
  }

  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message: "El formulario aún no está activo. Llámanos al 609 005 163 o escríbenos a aislaser@aislaser.es.",
      values,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { error } = await supabase.from("contact_messages").insert({ name, phone, email, service, message });
  if (error) {
    console.error("contact_messages insert", error);
    if (error.message.includes("Demasiados mensajes")) {
      return { status: "error", message: "Ahora mismo hay demasiados envíos. Inténtalo en unos minutos o llámanos al 609 005 163.", values };
    }
    return {
      status: "error",
      message: "No hemos podido enviar tu mensaje. Inténtalo de nuevo o llámanos al 609 005 163.",
      values,
    };
  }
  return { status: "ok" };
}
