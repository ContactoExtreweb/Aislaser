import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { SettingsForm } from "@/components/panel/SettingsForm";
import { getBranding } from "@/lib/dossier/branding";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await getSupabaseServer();
  const { settings, branding } = await getBranding(supabase);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-extrabold tracking-[0.22em] text-ink-400 uppercase">Panel de Aislaser</p>
      <h1 className="mt-2 text-5xl font-bold">Ajustes</h1>
      <div className="mt-8">
        {settings ? (
          <SettingsForm settings={settings} stampUrl={branding.stampUrl} signatureUrl={branding.signatureUrl} />
        ) : (
          <p className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800" role="alert">
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            Falta actualizar la base de datos: ejecuta supabase/migrations/002_informe_y_firma.sql en el SQL Editor de Supabase y recarga esta página.
          </p>
        )}
      </div>
    </main>
  );
}
