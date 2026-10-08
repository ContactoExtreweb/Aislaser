import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Download, FileText, ImageIcon, ListOrdered, Plus } from "lucide-react";
import { createDossier } from "@/app/panel/actions";
import { DossierActions } from "@/components/panel/DossierActions";
import { formatDate } from "@/components/panel/document/DossierDocument";
import { publicImageUrl } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis dosieres" };

type Row = {
  id: string;
  title: string;
  client_name: string;
  location: string;
  work_date: string | null;
  status: "borrador" | "terminado";
  cover_image_path: string | null;
  updated_at: string;
  dossier_points: { count: number }[];
  dossier_images: { count: number }[];
};

export default async function PanelHome({ searchParams }: PageProps<"/panel">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const supabase = await getSupabaseServer();
  let request = supabase
    .from("dossiers")
    .select("id, title, client_name, location, work_date, status, cover_image_path, updated_at, dossier_points(count), dossier_images(count)")
    .order("updated_at", { ascending: false });
  if (query) {
    const like = `%${query.replace(/[%_,()]/g, " ")}%`;
    request = request.or(`title.ilike.${like},client_name.ilike.${like},location.ilike.${like},reference.ilike.${like}`);
  }
  const { data, error } = await request;
  const dossiers = (data ?? []) as Row[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold tracking-[0.22em] text-ink-400 uppercase">Panel de Aislaser</p>
          <h1 className="mt-2 text-5xl font-bold">Mis dosieres</h1>
        </div>
        <form action={createDossier}>
          <button type="submit" className="btn-primary text-base">
            <Plus className="size-5" strokeWidth={2.5} /> Nuevo dosier
          </button>
        </form>
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          { icon: Plus, t: "Crea un dosier", d: "Pon el título, el cliente y una foto de portada." },
          { icon: ListOrdered, t: "Escribe cada punto", d: "1, 2, 3… cada uno con su explicación." },
          { icon: Camera, t: "Añade sus fotos", d: "Arrástralas, pégalas o hazlas con el móvil." },
          { icon: Download, t: "Descárgalo", d: "En PDF o en imágenes, listo para enviar." },
        ].map((s, i) => (
          <li key={s.t} className="flex gap-3 rounded-2xl border border-ink-200 bg-white p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-laser-500 font-display text-lg font-bold text-ink-900">{i + 1}</span>
            <span>
              <span className="block text-sm font-extrabold text-ink-900">{s.t}</span>
              <span className="block text-xs leading-snug text-ink-500">{s.d}</span>
            </span>
          </li>
        ))}
      </ol>

      <form className="mt-10" role="search">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por título, cliente, obra o referencia…"
          className="w-full rounded-2xl border border-ink-200 bg-white px-5 py-3.5 outline-none focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25"
        />
      </form>

      {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error al cargar los dosieres: {error.message}</p>}

      {dossiers.length === 0 && !error ? (
        <div className="mt-8 flex flex-col items-center rounded-[2rem] border-2 border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-ink-100 text-ink-500">
            <FileText className="size-8" />
          </span>
          <p className="mt-6 font-display text-3xl font-bold text-ink-900">{query ? "No hay resultados" : "Aún no tienes dosieres"}</p>
          <p className="mt-2 text-ink-500">{query ? "Prueba con otra búsqueda." : "Pulsa en «Nuevo dosier» para crear el primero."}</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dossiers.map((d) => {
            const cover = publicImageUrl(d.cover_image_path);
            const points = d.dossier_points[0]?.count ?? 0;
            const photos = d.dossier_images[0]?.count ?? 0;
            return (
              <li key={d.id} className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-ink-200 bg-white transition-shadow hover:shadow-[0_30px_60px_-40px_rgb(0_0_0/0.45)]">
                <Link href={`/panel/dosieres/${d.id}`} className="relative block aspect-[16/10] bg-ink-900">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <span className="bg-grid-dark grid size-full place-items-center text-ink-600">
                      <ImageIcon className="size-10" />
                    </span>
                  )}
                  <span
                    className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase ${
                      d.status === "terminado" ? "bg-emerald-500 text-white" : "bg-white text-ink-700"
                    }`}
                  >
                    {d.status === "terminado" ? "Terminado" : "Borrador"}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <Link href={`/panel/dosieres/${d.id}`} className="font-display text-2xl leading-tight font-bold text-ink-900 hover:underline">
                    {d.title || "Dosier sin título"}
                  </Link>
                  <p className="mt-1 text-sm text-ink-500">{[d.client_name, d.location].filter(Boolean).join(" · ") || "Sin cliente"}</p>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <p className="text-xs font-semibold text-ink-400">
                      {points} puntos · {photos} fotos
                      <br />
                      {d.work_date ? formatDate(d.work_date) : `Editado ${new Date(d.updated_at).toLocaleDateString("es-ES")}`}
                    </p>
                    <DossierActions id={d.id} title={d.title} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
