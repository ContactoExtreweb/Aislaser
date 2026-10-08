"use server";

import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export type ContactState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "privacy", string>>;
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

  const fieldErrors: ContactState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Indica tu nombre";
  if (phone.replace(/\D/g, "").length < 9) fieldErrors.phone = "Indica un teléfono válido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Indica un email válido";
  if (!privacy) fieldErrors.privacy = "Debes aceptar la política de privacidad";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors };
  }

  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message: "El formulario aún no está activo. Llámanos al 609 005 163 o escríbenos a aislaser@aislaser.es.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { error } = await supabase.from("contact_messages").insert({ name, phone, email, service, message });
  if (error) {
    console.error("contact_messages insert", error);
    return {
      status: "error",
      message: "No hemos podido enviar tu mensaje. Inténtalo de nuevo o llámanos al 609 005 163.",
    };
  }
  return { status: "ok" };
}
