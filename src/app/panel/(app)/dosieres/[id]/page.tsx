import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DossierWorkspace } from "@/components/panel/editor/DossierWorkspace";
import { hydrateDossier } from "@/lib/dossier/supabase-repo";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar dosier" };

export default async function EditDossierPage({ params }: PageProps<"/panel/dosieres/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await getSupabaseServer();
  const [{ data: dossier }, { data: points }, { data: images }] = await Promise.all([
    supabase
      .from("dossiers")
      .select("id, title, subtitle, client_name, location, work_date, reference, intro, cover_image_path, status, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("dossier_points").select("id, dossier_id, position, title, body, image_layout").eq("dossier_id", id),
    supabase.from("dossier_images").select("id, dossier_id, point_id, storage_path, caption, position, width, height").eq("dossier_id", id),
  ]);
  if (!dossier) notFound();

  return <DossierWorkspace key={dossier.id} initial={hydrateDossier(dossier, points ?? [], images ?? [])} />;
}
