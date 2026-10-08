import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DossierWorkspace } from "@/components/panel/editor/DossierWorkspace";
import { getBranding } from "@/lib/dossier/branding";
import { hydrateDossier, needsInformeMigration } from "@/lib/dossier/hydrate";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar dosier" };

export default async function EditDossierPage({ params }: PageProps<"/panel/dosieres/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await getSupabaseServer();
  const [{ data: dossier }, { data: points }, { data: images }, { source }] = await Promise.all([
    // select("*") para que funcione también antes de ejecutar la migración 002
    supabase.from("dossiers").select("*").eq("id", id).maybeSingle(),
    supabase.from("dossier_points").select("id, dossier_id, position, title, body, image_layout").eq("dossier_id", id).order("position"),
    supabase
      .from("dossier_images")
      .select("id, dossier_id, point_id, storage_path, caption, position, width, height")
      .eq("dossier_id", id)
      .order("position"),
    getBranding(supabase),
  ]);
  if (!dossier) notFound();

  return (
    <DossierWorkspace
      key={dossier.id}
      initial={hydrateDossier(dossier, points ?? [], images ?? [])}
      brandingSource={source}
      needsMigration={needsInformeMigration(dossier)}
    />
  );
}
