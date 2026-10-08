import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandingSource } from "./types";

export type AppSettings = {
  signer_name: string;
  signer_company: string;
  stamp_path: string | null;
  signature_path: string | null;
};

export const DEFAULT_BRANDING_SOURCE: BrandingSource = {
  signerName: "Isidro Calvo Gallego",
  signerCompany: "AISLASER, C.B.",
  stampPath: null,
  signaturePath: null,
};

/**
 * Lee los ajustes de empresa. Sólo devuelve las RUTAS del sello y la firma: el navegador
 * las descarga con la sesión del administrador, así nunca circula un enlace válido sin sesión.
 * Si la migración 002 aún no se ha ejecutado devuelve los valores por defecto.
 */
export async function getBranding(supabase: SupabaseClient): Promise<{ source: BrandingSource; settings: AppSettings | null }> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("signer_name, signer_company, stamp_path, signature_path")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return { source: DEFAULT_BRANDING_SOURCE, settings: null };
  const settings = data as AppSettings;
  return {
    settings,
    source: {
      signerName: settings.signer_name || DEFAULT_BRANDING_SOURCE.signerName,
      signerCompany: settings.signer_company || DEFAULT_BRANDING_SOURCE.signerCompany,
      stampPath: settings.stamp_path,
      signaturePath: settings.signature_path,
    },
  };
}
