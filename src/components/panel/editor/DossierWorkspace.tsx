"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CircleAlert, CircleCheck, Eye, LoaderCircle, PencilLine, Plus, Sparkles } from "lucide-react";
import { DossierPreview } from "@/components/panel/document/DossierPreview";
import { createDemoRepo } from "@/lib/dossier/demo-repo";
import { createSupabaseRepo } from "@/lib/dossier/supabase-repo";
import { DEFAULT_BRANDING, type Branding, type Dossier } from "@/lib/dossier/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { ClosingCard, DetailsCard } from "./DetailsCard";
import { PointCard } from "./PointCard";
import { useDossierEditor } from "./useDossierEditor";

export function DossierWorkspace({
  initial,
  demo = false,
  branding = DEFAULT_BRANDING,
  needsMigration = false,
}: {
  initial: Dossier;
  demo?: boolean;
  branding?: Branding;
  /** La base de datos aún no tiene los campos del formato informe (migración 002) */
  needsMigration?: boolean;
}) {
  const repo = useMemo(() => (demo ? createDemoRepo() : createSupabaseRepo(getSupabaseBrowser())), [demo]);
  const api = useDossierEditor(initial, repo);
  const { dossier, save } = api;
  const [tab, setTab] = useState<"editar" | "vista">("editar");
  const [adding, setAdding] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => rootRef.current?.style.setProperty("--ws-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function addPoint() {
    setAdding(true);
    const id = await api.addPoint();
    setAdding(false);
    if (id) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`punto-${id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        el?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      });
    }
  }

  const totalImages = dossier.points.reduce((n, p) => n + p.images.length, 0);

  return (
    <div ref={rootRef} className="min-h-screen bg-ink-50">
      <div ref={headerRef} className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <Link
            href="/panel"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-700 hover:border-ink-900"
            aria-label="Volver a mis dosieres"
            onClick={() => api.flush()}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold text-ink-900">{dossier.title || (dossier.template === "informe" ? "Informe sin título" : "Dosier sin título")}</p>
            <SaveStatus pending={save.pending} error={save.error} demo={demo} />
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="flex flex-1 rounded-xl bg-ink-100 p-1 sm:flex-none" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "editar"}
                onClick={() => setTab("editar")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all sm:flex-none ${
                  tab === "editar" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <PencilLine className="size-4" /> Editar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "vista"}
                onClick={() => {
                  api.flush();
                  setTab("vista");
                  window.scrollTo({ top: 0 });
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all sm:flex-none ${
                  tab === "vista" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <Eye className="size-4" /> <span className="sm:hidden">Vista previa</span>
                <span className="hidden sm:inline">Vista previa y descarga</span>
              </button>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm font-bold text-ink-700">
              <input
                type="checkbox"
                className="size-4 accent-ink-900"
                checked={dossier.status === "terminado"}
                onChange={(e) => api.setField("status", e.target.checked ? "terminado" : "borrador")}
              />
              Terminado
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {tab === "editar" ? (
          <div className="space-y-6">
            {demo && (
              <p className="flex items-start gap-3 rounded-2xl border border-laser-500/50 bg-laser-500/15 p-4 text-sm font-semibold text-ink-800">
                <Sparkles className="mt-0.5 size-5 shrink-0" />
                Modo demostración: puedes probarlo todo (textos, fotos, PDF), pero los cambios no se guardan. Cuando se conecte la base
                de datos, cada cambio se guardará automáticamente.
              </p>
            )}
            {needsMigration && (
              <p className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
                <CircleAlert className="mt-0.5 size-5 shrink-0" />
                Falta actualizar la base de datos: ejecuta el archivo supabase/migrations/002_informe_y_firma.sql en el SQL Editor de
                Supabase. Hasta entonces no se guardarán los datos de cabecera del informe ni la firma.
              </p>
            )}
            <DetailsCard api={api} />

            {dossier.points.length === 0 && (
              <div className="rounded-[1.75rem] border-2 border-dashed border-ink-300 bg-white p-10 text-center">
                <p className="font-display text-2xl font-bold text-ink-900">Ahora añade el punto 1</p>
                <p className="mt-2 text-ink-500">Cada punto tiene su número, su explicación y sus fotos.</p>
              </div>
            )}

            {dossier.points.map((p, i) => (
              <PointCard
                key={p.id}
                point={p}
                index={i}
                total={dossier.points.length}
                pending={api.uploads[p.id] ?? []}
                api={api}
                template={dossier.template}
              />
            ))}

            <button
              type="button"
              onClick={addPoint}
              disabled={adding}
              className="group flex w-full items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-ink-300 bg-white py-8 font-display text-2xl font-bold text-ink-700 transition-all hover:border-laser-500 hover:bg-laser-500/10 hover:text-ink-900 disabled:opacity-60"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-laser-500 text-ink-900 transition-transform group-hover:scale-110">
                {adding ? <LoaderCircle className="size-6 animate-spin" /> : <Plus className="size-6" strokeWidth={2.5} />}
              </span>
              Añadir punto {dossier.points.length + 1}
            </button>

            <ClosingCard api={api} branding={branding} demo={demo} />

            <div className="flex flex-col items-center gap-3 pt-4 pb-10 text-center">
              <p className="text-sm text-ink-500">
                {dossier.points.length} {dossier.points.length === 1 ? "punto" : "puntos"} · {totalImages} {totalImages === 1 ? "foto" : "fotos"}
              </p>
              <button
                type="button"
                onClick={() => {
                  api.flush();
                  setTab("vista");
                  window.scrollTo({ top: 0 });
                }}
                className="btn-dark text-base"
              >
                <Eye className="size-4" /> Ver cómo queda y descargar
              </button>
            </div>
          </div>
        ) : (
          <DossierPreview dossier={dossier} branding={branding} />
        )}
      </div>
    </div>
  );
}

function SaveStatus({ pending, error, demo }: { pending: number; error: string | null; demo: boolean }) {
  if (demo) return <p className="text-xs font-semibold text-ink-400">Modo demostración · sin guardar</p>;
  if (error)
    return (
      <p className="flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
        <CircleAlert className="size-3.5" /> No se pudo guardar el último cambio ({error}). Revisa la conexión.
      </p>
    );
  if (pending > 0)
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <LoaderCircle className="size-3.5 animate-spin" /> Guardando…
      </p>
    );
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
      <CircleCheck className="size-3.5" /> Todos los cambios guardados
    </p>
  );
}
