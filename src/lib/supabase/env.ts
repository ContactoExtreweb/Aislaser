export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** false mientras no se hayan configurado las variables de entorno de Supabase */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const DOSSIER_BUCKET = "dossier-images";

export function publicImageUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/${DOSSIER_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
