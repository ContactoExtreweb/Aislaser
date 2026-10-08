import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObraEditor } from "@/components/panel/obras/ObraEditor";
import type { WebFoto, WebObra } from "@/lib/obras-shared";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Obra de la web" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ObraPanelPage({ params }: PageProps<"/panel/obras/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await getSupabaseServer();
  const [obra, fotos] = await Promise.all([
    supabase
      .from("web_obras")
      .select("id, slug, titulo, ubicacion, anio, sector, servicios, resumen, descripcion, destacada, publicada, orden, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("web_fotos").select("id, obra_id, storage_path, alt, ancho, alto, orden").eq("obra_id", id).order("orden").order("created_at"),
  ]);

  const error = obra.error ?? fotos.error;
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">No se pudo cargar la obra: {error.message}</p>
      </main>
    );
  }
  if (!obra.data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-ink-700">
          Esta obra ya no existe.{" "}
          <Link href="/panel/obras" className="font-bold underline">
            Volver a las obras
          </Link>
        </p>
      </main>
    );
  }

  // key: al cambiar de obra el formulario empieza con sus datos
  return <ObraEditor key={obra.data.id} obra={obra.data as WebObra} fotos={(fotos.data ?? []) as WebFoto[]} />;
}
