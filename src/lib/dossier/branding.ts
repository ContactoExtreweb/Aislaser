import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SIGNATURE_BUCKET } from "@/lib/supabase/env";
import { DEFAULT_BRANDING, type Branding } from "./types";

export type AppSettings = {
  signer_name: string;
  signer_company: string;
  stamp_path: string | null;
  signature_path: string | null;
};

/** Las URLs firmadas duran un día: suficiente para editar y exportar en una sesión */
const SIGNED_URL_SECONDS = 60 * 60 * 24;

/**
 * Lee los ajustes de empresa y genera URLs firmadas temporales para el sello y la firma.
 * Si la migración 002 aún no se ha ejecutado devuelve los valores por defecto.
 */
export async function getBranding(supabase: SupabaseClient): Promise<{ branding: Branding; settings: AppSettings | null }> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("signer_name, signer_company, stamp_path, signature_path")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return { branding: DEFAULT_BRANDING, settings: null };

  const settings = data as AppSettings;
  const sign = async (path: string | null) => {
    if (!path) return null;
    const { data: signed } = await supabase.storage.from(SIGNATURE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    return signed?.signedUrl ?? null;
  };
  const [stampUrl, signatureUrl] = await Promise.all([sign(settings.stamp_path), sign(settings.signature_path)]);
  return {
    settings,
    branding: {
      signerName: settings.signer_name || DEFAULT_BRANDING.signerName,
      signerCompany: settings.signer_company || DEFAULT_BRANDING.signerCompany,
      stampUrl,
      signatureUrl,
    },
  };
}
