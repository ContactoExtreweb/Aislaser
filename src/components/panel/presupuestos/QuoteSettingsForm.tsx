"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Save } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const field =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 leading-relaxed text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25";

/** Condiciones que llevan los presupuestos nuevos (cada presupuesto se puede cambiar después) */
export function QuoteSettingsForm({ conditions }: { conditions: string }) {
  const [value, setValue] = useState(conditions);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const { data, error } = await getSupabaseBrowser().from("app_settings").update({ condiciones_presupuesto: value.trim() }).eq("id", 1).select("id");
    setBusy(false);
    if (error || !data?.length) setMessage({ ok: false, text: `No se pudo guardar: ${error?.message ?? "la sesión ha caducado. Vuelve a entrar."}` });
    else setMessage({ ok: true, text: "Condiciones guardadas. Se usarán en los presupuestos nuevos." });
  }

  return (
    <section className="rounded-[1.75rem] border border-ink-200 bg-white p-5 sm:p-7">
      <h2 className="text-3xl font-bold">Condiciones de los presupuestos</h2>
      <p className="mt-1 text-ink-500">
        Las llevan todos los presupuestos nuevos: forma de pago, plazos, lo que no está incluido, garantía… Una condición por línea. En cada presupuesto se
        pueden cambiar.
      </p>
      <label className="mt-5 block">
        <span className="sr-only">Condiciones por defecto</span>
        <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={8} maxLength={8000} className={`${field} resize-y`} />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={busy} className="btn-dark disabled:opacity-60">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar condiciones
        </button>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`flex items-center gap-2 text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {message.ok ? <CircleCheck className="size-4" /> : <CircleAlert className="size-4" />} {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
