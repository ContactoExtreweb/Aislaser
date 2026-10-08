import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera, ExternalLink, ImageIcon, Images, PencilLine, Send, Star } from "lucide-react";
import { MoveObraButtons, NewObraForm } from "@/components/panel/obras/ObraListControls";
import { sectors, type Sector } from "@/content/projects";
import { galleryImageUrl } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Obras de la web" };

type Row = {
  id: string;
  slug: string;
  titulo: string;
  ubicacion: string;
  anio: string;
  sector: string | null;
  destacada: boolean;
  publicada: boolean;
  web_fotos: { storage_path: string; orden: number }[];
};

const FILTERS = [
  { value: "", label: "Todas" },
  { value: "publicadas", label: "En la web" },
  { value: "borradores", label: "Borradores" },
] as const;

export default async function ObrasPanelPage({ searchParams }: PageProps<"/panel/obras">) {
  const { estado, q } = await searchParams;
  const filter = typeof estado === "string" ? estado : "";
  const query = typeof q === "string" ? q.trim() : "";

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("web_obras")
    .select("id, slug, titulo, ubicacion, anio, sector, destacada, publicada, web_fotos(storage_path, orden)")
    .order("orden")
    .order("created_at", { ascending: false });
  const all = (data ?? []) as Row[];
  const missingTable = error && (error.code === "PGRST205" || error.code === "42P01");

  const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const obras = all.filter(
    (o) =>
      (filter === "publicadas" ? o.publicada : filter === "borradores" ? !o.publicada : true) &&
      (!query || normalize(`${o.titulo} ${o.ubicacion} ${o.anio}`).includes(normalize(query))),
  );
  const canReorder = !filter && !query;
  const published = all.filter((o) => o.publicada).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-extrabold tracking-[0.22em] text-ink-400 uppercase">Galería de la web</p>
          <h1 className="mt-2 text-5xl font-bold">Obras de la web</h1>
          <p className="mt-2 text-ink-500">
            Lo que publiques aquí sale en <strong className="text-ink-800">Obras</strong>, en la portada y en cada servicio de la web.
          </p>
        </div>
        {!missingTable && <NewObraForm />}
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          { icon: PencilLine, t: "Crea la obra", d: "Escribe su nombre y pulsa «Nueva obra»." },
          { icon: Camera, t: "Sube las fotos", d: "Arrástralas, pégalas o hazlas con el móvil." },
          { icon: Images, t: "Rellena los datos", d: "Sector, lugar, año y una breve explicación." },
          { icon: Send, t: "Publícala", d: "Sale en la web al momento. Puedes quitarla cuando quieras." },
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

      {missingTable ? (
        <div className="mt-8 rounded-[2rem] border-2 border-dashed border-laser-500 bg-laser-500/10 p-8">
          <p className="font-display text-2xl font-bold text-ink-900">Falta un paso en la base de datos</p>
          <p className="mt-2 text-ink-700">
            Ejecuta en Supabase → SQL Editor el archivo <code className="rounded bg-white px-1.5 py-0.5 break-all">supabase/migrations/004_galeria_web.sql</code> y recarga esta
            página.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex gap-2" aria-label="Filtrar obras">
              {FILTERS.map((f) => {
                const active = filter === f.value;
                const params = new URLSearchParams({ ...(f.value && { estado: f.value }), ...(query && { q: query }) }).toString();
                return (
                  <Link
                    key={f.value}
                    href={`/panel/obras${params ? `?${params}` : ""}`}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                      active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-900"
                    }`}
                  >
                    {f.label}
                    <span className={`ml-2 rounded-full px-1.5 text-[11px] ${active ? "bg-laser-500 text-ink-900" : "bg-ink-100 text-ink-500"}`}>
                      {f.value === "publicadas" ? published : f.value === "borradores" ? all.length - published : all.length}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <form className="flex-1" role="search">
              {filter && <input type="hidden" name="estado" value={filter} />}
              <input
                name="q"
                defaultValue={query}
                placeholder="Buscar por nombre, lugar o año…"
                className="w-full rounded-2xl border border-ink-200 bg-white px-5 py-2.5 outline-none focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25"
              />
            </form>
          </div>

          {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error al cargar las obras: {error.message}</p>}

          {obras.length === 0 && !error ? (
            <div className="mt-8 flex flex-col items-center rounded-[2rem] border-2 border-dashed border-ink-300 bg-white px-6 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-ink-100 text-ink-500">
                <Images className="size-8" />
              </span>
              <p className="mt-6 font-display text-3xl font-bold text-ink-900">{all.length ? "No hay resultados" : "Aún no hay obras"}</p>
              <p className="mt-2 text-ink-500">
                {all.length ? "Prueba con otra búsqueda o filtro." : "Escribe el nombre de una obra arriba y pulsa «Nueva obra»."}
              </p>
            </div>
          ) : (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {obras.map((o, i) => {
                const cover = [...o.web_fotos].sort((a, b) => a.orden - b.orden)[0];
                const photos = o.web_fotos.length;
                return (
                  <li
                    key={o.id}
                    className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-ink-200 bg-white transition-shadow hover:shadow-[0_30px_60px_-40px_rgb(0_0_0/0.45)]"
                  >
                    <Link href={`/panel/obras/${o.id}`} className="relative block aspect-[16/10] overflow-hidden bg-ink-900">
                      {cover ? (
                        <Image
                          src={galleryImageUrl(cover.storage_path)}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <span className="bg-grid-dark grid size-full place-items-center text-ink-600">
                          <ImageIcon className="size-10" />
                        </span>
                      )}
                      <span
                        className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase ${
                          o.publicada && photos > 0 ? "bg-emerald-500 text-white" : o.publicada ? "bg-laser-500 text-ink-900" : "bg-white text-ink-700"
                        }`}
                      >
                        {o.publicada && photos > 0 ? "En la web" : o.publicada ? "No sale: sin fotos" : "Borrador"}
                      </span>
                      {o.destacada && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-ink-950/80 px-3 py-1 text-[11px] font-extrabold tracking-wider text-laser-500 uppercase backdrop-blur">
                          <Star className="size-3 fill-current" /> Portada
                        </span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <Link href={`/panel/obras/${o.id}`} className="font-display text-2xl leading-tight font-bold text-ink-900 hover:underline">
                        {o.titulo}
                      </Link>
                      <p className="mt-1 text-sm text-ink-500">
                        {[o.ubicacion, o.anio].filter(Boolean).join(" · ") || (o.sector ? sectors[o.sector as Sector]?.short : "Sin datos todavía")}
                      </p>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-5">
                        <p className="text-xs font-semibold text-ink-400">
                          {photos === 1 ? "1 foto" : `${photos} fotos`}
                          {o.sector && sectors[o.sector as Sector] && (
                            <>
                              <br />
                              {sectors[o.sector as Sector].short}
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-1">
                          {o.publicada && (
                            <Link
                              href={`/obras/${o.slug}`}
                              target="_blank"
                              className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                              title="Ver en la web"
                              aria-label={`Ver ${o.titulo} en la web`}
                            >
                              <ExternalLink className="size-4" />
                            </Link>
                          )}
                          {canReorder && <MoveObraButtons id={o.id} title={o.titulo} first={i === 0} last={i === obras.length - 1} />}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
