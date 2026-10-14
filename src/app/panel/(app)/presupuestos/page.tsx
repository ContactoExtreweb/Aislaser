import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, FileSpreadsheet } from "lucide-react";
import { QuoteActions, NewQuoteButton } from "@/components/panel/presupuestos/QuoteActions";
import { RefreshOnReturn } from "@/components/panel/presupuestos/RefreshOnReturn";
import { formatDate } from "@/components/panel/document/DossierDocument";
import { QUOTE_STATUSES, formatEuros, hydrateQuote, quoteNumber, quoteTotals, statusInfo, type QuoteStatus } from "@/lib/presupuestos/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function PresupuestosPage({ searchParams }: PageProps<"/panel/presupuestos">) {
  const { q, estado } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const status = QUOTE_STATUSES.some((s) => s.value === estado) ? (estado as QuoteStatus) : null;

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("presupuestos")
    .select(
      "id, anio, numero, estado, fecha, cliente_nombre, obra, ubicacion, iva, descuento, updated_at, presupuesto_partidas(id, tipo, cantidad, precio, orden)",
    )
    .order("anio", { ascending: false })
    .order("numero", { ascending: false });
  const missingTable = error?.code === "PGRST205" || error?.code === "42P01";

  const all = (data ?? []).map((row) => {
    const { presupuesto_partidas: lines, ...rest } = row as Record<string, unknown> & { presupuesto_partidas: Record<string, unknown>[] };
    const quote = hydrateQuote({ ...rest }, lines ?? []);
    return { ...quote, total: quoteTotals(quote).total };
  });

  // Búsqueda por número, cliente, obra o ubicación (sin distinguir tildes ni mayúsculas)
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const needle = norm(query);
  const matching = needle ? all.filter((p) => norm(`${quoteNumber(p)} ${p.cliente_nombre} ${p.obra} ${p.ubicacion}`).includes(needle)) : all;
  const shown = status ? matching.filter((p) => p.estado === status) : matching;

  const year = new Date().getFullYear();
  const acceptedThisYear = all.filter((p) => p.estado === "aceptado" && p.anio === year).reduce((sum, p) => sum + p.total, 0);
  const pending = all.filter((p) => p.estado === "enviado");

  const href = (next: { q?: string; estado?: string | null }) => {
    const params = new URLSearchParams();
    const qq = next.q ?? query;
    const ee = next.estado === undefined ? status : next.estado;
    if (qq) params.set("q", qq);
    if (ee) params.set("estado", ee);
    const s = params.toString();
    return `/panel/presupuestos${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <RefreshOnReturn />
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold tracking-[0.22em] text-ink-400 uppercase">Panel de Aislaser</p>
          <h1 className="mt-2 text-5xl font-bold">Presupuestos</h1>
        </div>
        {!missingTable && <NewQuoteButton />}
      </div>

      {missingTable ? (
        <p className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800" role="alert">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          Falta preparar la base de datos: ejecuta supabase/migrations/005_presupuestos.sql en el SQL Editor de Supabase y recarga esta página.
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
              <p className="text-xs font-extrabold tracking-[0.18em] text-ink-400 uppercase">Presupuestos</p>
              <p className="mt-1 font-display text-4xl font-bold">{all.length}</p>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
              <p className="text-xs font-extrabold tracking-[0.18em] text-ink-400 uppercase">Enviados sin respuesta</p>
              <p className="mt-1 font-display text-4xl font-bold">{pending.length}</p>
            </div>
            <div className="rounded-2xl bg-ink-950 p-5 text-white">
              <p className="text-xs font-extrabold tracking-[0.18em] text-ink-400 uppercase">Aceptado en {year} (con IVA)</p>
              <p className="mt-1 font-display text-4xl font-bold text-laser-500">{formatEuros(acceptedThisYear)}</p>
            </div>
          </div>

          <form className="mt-8" role="search">
            {status && <input type="hidden" name="estado" value={status} />}
            <input
              type="search"
              name="q"
              aria-label="Buscar presupuestos"
              enterKeyHint="search"
              defaultValue={query}
              placeholder="Buscar por número, cliente, obra o ubicación…"
              className="w-full rounded-2xl border border-ink-200 bg-white px-5 py-3.5 outline-none focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25"
            />
          </form>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por estado">
            {[{ value: null, label: "Todos" }, ...QUOTE_STATUSES].map((s) => {
              const count = s.value ? matching.filter((p) => p.estado === s.value).length : matching.length;
              const active = status === s.value;
              return (
                <Link
                  key={s.label}
                  href={href({ estado: s.value })}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${active ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:text-ink-900"}`}
                >
                  {s.label} <span className={active ? "text-laser-500" : "text-ink-400"}>{count}</span>
                </Link>
              );
            })}
          </nav>

          {error && !missingTable && (
            <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error al cargar los presupuestos: {error.message}</p>
          )}

          {shown.length === 0 && !error ? (
            <div className="mt-8 flex flex-col items-center rounded-[2rem] border-2 border-dashed border-ink-300 bg-white px-6 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-ink-100 text-ink-500">
                <FileSpreadsheet className="size-8" />
              </span>
              <p className="mt-6 font-display text-3xl font-bold text-ink-900">{all.length ? "No hay resultados" : "Aún no hay presupuestos"}</p>
              <p className="mt-2 text-ink-500">
                {all.length ? "Prueba con otra búsqueda u otro estado." : "Pulsa en «Nuevo presupuesto» o créalo desde un mensaje de la web."}
              </p>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-ink-100 overflow-hidden rounded-[1.75rem] border border-ink-200 bg-white">
              {shown.map((p) => {
                const info = statusInfo(p.estado);
                return (
                  <li key={p.id} className="flex flex-col gap-3 p-5 transition-colors hover:bg-ink-50/60 sm:flex-row sm:items-center sm:gap-6">
                    <Link href={`/panel/presupuestos/${p.id}`} className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-xl font-bold text-ink-900">Nº {quoteNumber(p)}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider uppercase ${info.tone}`}>{info.label}</span>
                      </span>
                      <span className="mt-1 block truncate font-bold text-ink-800">{p.cliente_nombre || "Sin cliente"}</span>
                      <span className="block truncate text-sm text-ink-500">
                        {[p.obra, p.ubicacion].filter(Boolean).join(" · ") || "Sin descripción de la obra"} · {formatDate(p.fecha)}
                      </span>
                    </Link>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="text-right">
                        <span className="block font-display text-2xl font-bold text-ink-900">{formatEuros(p.total)}</span>
                        <span className="block text-xs font-semibold text-ink-400">IVA incluido</span>
                      </span>
                      <QuoteActions id={p.id} label={`el presupuesto ${quoteNumber(p)}`} />
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
