"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CircleAlert,
  Copy,
  Eye,
  FolderPlus,
  Inbox,
  LoaderCircle,
  PencilLine,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { SaveStatus } from "@/components/panel/editor/DossierWorkspace";
import type { BrandingSource } from "@/lib/dossier/types";
import { useBranding } from "@/lib/dossier/useBranding";
import {
  CATALOG,
  QUOTE_STATUSES,
  UNITS,
  addDays,
  formatEuros,
  formatPercent,
  lineCents,
  parseDecimal,
  quoteNumber,
  quoteTotals,
  type LineFields,
  type Quote,
  type QuoteLine,
  type QuoteStatus,
} from "@/lib/presupuestos/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { QuotePreview } from "./QuotePreview";
import { useQuoteEditor } from "./useQuoteEditor";

const field =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25";
const card = "rounded-[1.75rem] border border-ink-200 bg-white p-5 shadow-[0_20px_50px_-40px_rgb(0_0_0/0.4)] sm:p-7";
const iconButton = "grid size-9 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30";

type Editor = ReturnType<typeof useQuoteEditor>;

export function QuoteWorkspace({ initial, brandingSource }: { initial: Quote; brandingSource: BrandingSource }) {
  const api = useQuoteEditor(initial);
  const { quote, save } = api;
  const branding = useBranding(brandingSource);
  const [tab, setTab] = useState<"editar" | "vista">("editar");
  const [sessionLost, setSessionLost] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Si la sesión caduca o se cierra en otro dispositivo, avisar en vez de "guardar" en vacío
  useEffect(() => {
    const { data } = getSupabaseBrowser().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) setSessionLost(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => rootRef.current?.style.setProperty("--ws-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showPreview = () => {
    setTab("vista");
    window.scrollTo({ top: 0 });
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-ink-50">
      <div ref={headerRef} className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <Link
            href="/panel/presupuestos"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-700 hover:border-ink-900"
            aria-label="Volver a los presupuestos"
            onClick={(e) => {
              if (save.failed > 0 && !confirm("Hay cambios que no se han podido guardar todavía. ¿Salir igualmente?")) e.preventDefault();
            }}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold text-ink-900">
              Presupuesto {quoteNumber(quote)}
              {quote.cliente_nombre && <span className="font-sans text-base font-semibold text-ink-500"> · {quote.cliente_nombre}</span>}
            </p>
            <SaveStatus save={save} onRetry={api.retryAll} />
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
                onClick={showPreview}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all sm:flex-none ${
                  tab === "vista" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <Eye className="size-4" /> <span className="sm:hidden">Vista previa</span>
                <span className="hidden sm:inline">Vista previa y PDF</span>
              </button>
            </div>
            <label className="sr-only" htmlFor="quote-status">
              Estado del presupuesto
            </label>
            <select
              id="quote-status"
              value={quote.estado}
              onChange={(e) => api.setField("estado", e.target.value as QuoteStatus)}
              className="shrink-0 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-bold text-ink-800 outline-none focus:border-ink-900"
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {tab === "editar" ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {sessionLost && (
                <p
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
                  role="alert"
                >
                  <CircleAlert className="size-5 shrink-0" />
                  Tu sesión ha caducado: los cambios nuevos no se pueden guardar.
                  <a href={`/panel/login?next=/panel/presupuestos/${quote.id}`} className="btn-dark !py-2 text-xs">
                    Volver a entrar
                  </a>
                </p>
              )}
              <ClientCard api={api} />
              <DetailsCard api={api} />
              <LinesCard api={api} />
              <TextsCard api={api} />
            </div>
            <aside className="lg:col-span-4">
              <div className="space-y-4 lg:sticky" style={{ top: "calc(var(--ws-h, 0px) + 1.5rem)" }}>
                <TotalsCard quote={quote} />
                <button type="button" onClick={showPreview} className="btn-dark w-full text-base">
                  <Eye className="size-4" /> Ver cómo queda y descargar
                </button>
                {quote.mensaje_id && (
                  <Link
                    href="/panel/mensajes"
                    className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-4 text-sm font-semibold text-ink-600 hover:border-ink-900"
                  >
                    <Inbox className="size-4 shrink-0" /> Creado a partir de una solicitud de la web
                  </Link>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <QuotePreview quote={quote} branding={branding} />
        )}
      </div>

      {/* En el móvil el total va siempre a la vista */}
      {tab === "editar" && (
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-white/10 bg-ink-950 px-4 py-3 text-white lg:hidden print:hidden">
          <p>
            <span className="block text-[11px] font-extrabold tracking-[0.16em] text-ink-400 uppercase">Total con IVA</span>
            <span className="font-display text-2xl font-bold text-laser-500 tabular-nums">{formatEuros(quoteTotals(quote).total)}</span>
          </p>
          <button type="button" onClick={showPreview} className="btn-primary !px-4 !py-2.5 text-sm">
            <Eye className="size-4" /> Vista previa
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------- Cliente ----------------------------------- */

function TextField({
  label,
  value,
  onChange,
  max,
  placeholder,
  type = "text",
  className = "",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  type?: string;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-ink-800">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} placeholder={placeholder} className={field} />
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

function ClientCard({ api }: { api: Editor }) {
  const q = api.quote;
  return (
    <section className={card}>
      <h2 className="text-3xl font-bold">Cliente</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField label="Nombre o empresa" value={q.cliente_nombre} onChange={(v) => api.setField("cliente_nombre", v)} max={200} className="sm:col-span-2" />
        <TextField label="NIF / CIF" value={q.cliente_nif} onChange={(v) => api.setField("cliente_nif", v)} max={30} />
        <TextField label="A/A (persona de contacto)" value={q.atencion} onChange={(v) => api.setField("atencion", v)} max={200} />
        <TextField label="Dirección" value={q.cliente_direccion} onChange={(v) => api.setField("cliente_direccion", v)} max={300} className="sm:col-span-2" />
        <TextField label="Teléfono" type="tel" value={q.cliente_telefono} onChange={(v) => api.setField("cliente_telefono", v)} max={40} />
        <TextField label="Email" type="email" value={q.cliente_email} onChange={(v) => api.setField("cliente_email", v)} max={200} />
      </div>
    </section>
  );
}

/* --------------------------------- Datos generales --------------------------------- */

/** Campo numérico que admite coma decimal; guarda en cuanto el número es válido */
function NumberField({
  value,
  onChange,
  label,
  suffix,
  min,
  max,
  className = "",
  inputClassName = field,
  labelClassName = "text-sm font-bold text-ink-800",
  ariaLabel,
  decimals,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  suffix?: string;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  /** Nombre accesible más completo que la etiqueta visible */
  ariaLabel?: string;
  /** Decimales fijos al mostrarlo (el precio, con dos: 24,90) */
  decimals?: number;
}) {
  const format = (n: number) => (decimals === undefined ? String(n) : n.toFixed(decimals)).replace(".", ",");
  const [text, setText] = useState(format(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : format(value);
  const invalid =
    focused &&
    (() => {
      const n = parseDecimal(text);
      return n === null || (min !== undefined && n < min) || (max !== undefined && n > max);
    })();
  return (
    <label className={`block ${className}`}>
      <span className={labelClassName}>{label}</span>
      <span className="relative block">
        <input
          inputMode="decimal"
          aria-label={ariaLabel}
          value={shown}
          aria-invalid={invalid || undefined}
          onFocus={() => {
            setText(format(value));
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseDecimal(e.target.value);
            if (n === null || (min !== undefined && n < min) || (max !== undefined && n > max)) return;
            onChange(n);
          }}
          className={`${inputClassName} ${suffix ? "pr-9" : ""} text-right tabular-nums ${invalid ? "!border-red-500" : ""}`}
        />
        {suffix && (
          // Centrado respecto al campo (el de las fichas lleva margen superior)
          <span className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-400 ${inputClassName.includes("mt-1.5") ? "mt-[3px]" : ""}`}>
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function DetailsCard({ api }: { api: Editor }) {
  const q = api.quote;
  return (
    <section className={card}>
      <h2 className="text-3xl font-bold">Presupuesto</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-6">
        <TextField
          label="Obra o trabajo"
          value={q.obra}
          onChange={(v) => api.setField("obra", v)}
          max={300}
          placeholder="Impermeabilización de cubierta con poliurea"
          className="sm:col-span-6"
        />
        <TextField
          label="Ubicación de la obra"
          value={q.ubicacion}
          onChange={(v) => api.setField("ubicacion", v)}
          max={200}
          placeholder="Campanario (Badajoz)"
          className="sm:col-span-6"
        />
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-ink-800">Fecha</span>
          <input type="date" value={q.fecha} onChange={(e) => e.target.value && api.setField("fecha", e.target.value)} className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-ink-800">Validez</span>
          <select value={q.validez_dias} onChange={(e) => api.setField("validez_dias", Number(e.target.value))} className={field}>
            {[...new Set([15, 30, 60, 90, q.validez_dias])]
              .sort((a, b) => a - b)
              .map((d) => (
                <option key={d} value={d}>
                  {d} días
                </option>
              ))}
          </select>
          <span className="mt-1 block text-xs text-ink-400">
            Hasta el {new Date(`${addDays(q.fecha, q.validez_dias)}T00:00:00Z`).toLocaleDateString("es-ES", { timeZone: "UTC" })}
          </span>
        </label>
        <label className="block sm:col-span-1">
          <span className="text-sm font-bold text-ink-800">IVA</span>
          <select value={q.iva} onChange={(e) => api.setField("iva", Number(e.target.value))} className={field}>
            {[...new Set([21, 10, 4, 0, q.iva])]
              .sort((a, b) => b - a)
              .map((v) => (
                <option key={v} value={v}>
                  {formatPercent(v)}
                </option>
              ))}
          </select>
        </label>
        <NumberField
          label="Descuento"
          value={q.descuento}
          onChange={(n) => api.setField("descuento", n)}
          suffix="%"
          min={0}
          max={100}
          className="sm:col-span-1"
        />
      </div>
    </section>
  );
}

/* ------------------------------------ Partidas ------------------------------------ */

function lineNumbers(lines: QuoteLine[]) {
  const out: Record<string, string> = {};
  let chapter = 0;
  let item = 0;
  for (const l of lines) {
    if (l.tipo === "capitulo") {
      chapter += 1;
      item = 0;
      out[l.id] = String(chapter);
    } else {
      item += 1;
      out[l.id] = chapter ? `${chapter}.${item}` : String(item);
    }
  }
  return out;
}

function LinesCard({ api }: { api: Editor }) {
  const { lineas } = api.quote;
  const numbers = useMemo(() => lineNumbers(lineas), [lineas]);
  const totals = useMemo(() => quoteTotals(api.quote), [api.quote]);
  const [adding, setAdding] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  async function add(fields: Partial<LineFields>, key: string) {
    setAdding(key);
    const id = await api.addLine(fields);
    setAdding(null);
    setCatalogOpen(false);
    if (id) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-line="${id}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input")?.focus({ preventScroll: true });
      });
    }
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Partidas</h2>
          <p className="mt-1 text-sm text-ink-500">Usa capítulos para agrupar (p. ej. «Cubierta», «Petos») y ver el total de cada uno.</p>
        </div>
      </div>

      <ol className="mt-4 divide-y divide-ink-100 border-y border-ink-100">
        {lineas.map((l, i) =>
          l.tipo === "capitulo" ? (
            <ChapterRow key={l.id} line={l} number={numbers[l.id]} cents={totals.chapters[l.id] ?? 0} index={i} total={lineas.length} api={api} />
          ) : (
            <LineRow key={l.id} line={l} number={numbers[l.id]} index={i} total={lineas.length} api={api} />
          ),
        )}
      </ol>
      {lineas.length === 0 && <p className="mt-4 rounded-2xl bg-ink-50 p-6 text-center text-ink-500">Añade la primera partida.</p>}

      <datalist id="quote-units">
        {UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => add({ tipo: "partida" }, "partida")} disabled={!!adding} className="btn-primary !py-2.5 disabled:opacity-60">
          {adding === "partida" ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" strokeWidth={2.5} />} Partida
        </button>
        <button type="button" onClick={() => add({ tipo: "capitulo" }, "capitulo")} disabled={!!adding} className="btn-dark !py-2.5 disabled:opacity-60">
          {adding === "capitulo" ? <LoaderCircle className="size-4 animate-spin" /> : <FolderPlus className="size-4" />} Capítulo
        </button>
        <button
          type="button"
          onClick={() => setCatalogOpen((o) => !o)}
          aria-expanded={catalogOpen}
          aria-controls="quote-catalog"
          className={`btn !py-2.5 border bg-white text-ink-800 hover:border-ink-900 ${catalogOpen ? "border-ink-900" : "border-ink-300"}`}
        >
          <Sparkles className="size-4" /> Partidas frecuentes
        </button>
      </div>
      {catalogOpen && (
        <div id="quote-catalog" className="mt-3 max-h-[60vh] overflow-y-auto rounded-2xl border border-ink-200 bg-white p-2 sm:columns-2 sm:gap-2">
          {CATALOG.map((g) => (
            <div key={g.group} className="break-inside-avoid p-2">
              <p className="px-2 text-[11px] font-extrabold tracking-[0.16em] text-ink-400 uppercase">{g.group}</p>
              <ul className="mt-1">
                {g.items.map((it) => (
                  <li key={it.descripcion}>
                    <button
                      type="button"
                      disabled={!!adding}
                      onClick={() => add({ ...it, tipo: "partida" }, it.descripcion)}
                      className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm text-ink-700 hover:bg-ink-50 disabled:opacity-60"
                    >
                      <span className="mt-0.5 shrink-0 rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold text-ink-600">{it.unidad}</span>
                      <span className="leading-snug">{it.descripcion}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RowActions({ line, index, total, api }: { line: QuoteLine; index: number; total: number; api: Editor }) {
  const label = line.tipo === "capitulo" ? "el capítulo" : "la partida";
  return (
    <div className="flex items-center justify-end">
      <button type="button" className={iconButton} disabled={index === 0} onClick={() => api.moveLine(line.id, -1)} aria-label={`Subir ${label}`} title="Subir">
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={index === total - 1}
        onClick={() => api.moveLine(line.id, 1)}
        aria-label={`Bajar ${label}`}
        title="Bajar"
      >
        <ArrowDown className="size-4" />
      </button>
      <button type="button" className={iconButton} onClick={() => void api.duplicateLine(line.id)} aria-label={`Duplicar ${label}`} title="Duplicar">
        <Copy className="size-4" />
      </button>
      <button
        type="button"
        className={`${iconButton} hover:!bg-red-50 hover:!text-red-600`}
        onClick={() => {
          const empty = !line.descripcion.trim() && line.precio === 0;
          if (empty || confirm(`¿Eliminar ${label}${line.descripcion ? ` «${line.descripcion.slice(0, 60)}»` : ""}?`)) void api.deleteLine(line.id);
        }}
        aria-label={`Eliminar ${label}`}
        title="Eliminar"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

const cellInput =
  "w-full rounded-lg border border-ink-200 bg-white px-2.5 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25";

const tinyLabel = "mb-1 block text-[11px] font-extrabold tracking-wider text-ink-400 uppercase";

function LineRow({ line, number, index, total, api }: { line: QuoteLine; number: string; index: number; total: number; api: Editor }) {
  return (
    <li data-line={line.id} className="grid grid-cols-[2.25rem_1fr] gap-x-2 gap-y-2 py-4">
      <span className="pt-2.5 text-sm font-bold text-ink-400 tabular-nums">{number}</span>
      <label className="block">
        <span className="sr-only">Descripción de la partida {number}</span>
        <textarea
          value={line.descripcion}
          onChange={(e) => api.setLine(line.id, "descripcion", e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Descripción del trabajo"
          className={`${cellInput} min-h-[2.6rem] resize-y leading-relaxed [field-sizing:content]`}
        />
      </label>
      <div className="col-start-2 flex flex-wrap items-end gap-x-2 gap-y-3">
        <label className="block w-20">
          <span className={tinyLabel}>Ud.</span>
          <input
            list="quote-units"
            value={line.unidad}
            onChange={(e) => api.setLine(line.id, "unidad", e.target.value)}
            maxLength={20}
            aria-label={`Unidad de la partida ${number}`}
            className={`${cellInput} text-center`}
          />
        </label>
        <NumberField
          label="Cantidad"
          ariaLabel={`Cantidad de la partida ${number}`}
          labelClassName={tinyLabel}
          value={line.cantidad}
          onChange={(n) => api.setLine(line.id, "cantidad", n)}
          inputClassName={cellInput}
          className="w-28"
        />
        <NumberField
          label="Precio"
          ariaLabel={`Precio unitario de la partida ${number}`}
          labelClassName={tinyLabel}
          value={line.precio}
          onChange={(n) => api.setLine(line.id, "precio", n)}
          suffix="€"
          decimals={2}
          inputClassName={cellInput}
          className="w-32"
        />
        <p className="ml-auto pb-2 text-right">
          <span className={`${tinyLabel} !mb-0.5`}>Importe</span>
          <span className="font-display text-xl font-bold text-ink-900 tabular-nums">{formatEuros(lineCents(line))}</span>
        </p>
        <div className="w-full sm:w-auto">
          <RowActions line={line} index={index} total={total} api={api} />
        </div>
      </div>
    </li>
  );
}

function ChapterRow({ line, number, cents, index, total, api }: { line: QuoteLine; number: string; cents: number; index: number; total: number; api: Editor }) {
  return (
    <li data-line={line.id} className="grid grid-cols-[2.25rem_1fr] items-center gap-2 bg-ink-50/70 py-3 md:grid-cols-[2.25rem_1fr_6.5rem_8.5rem]">
      <span className="text-sm font-extrabold text-ink-900 tabular-nums">{number}</span>
      <label className="block">
        <span className="sr-only">Título del capítulo {number}</span>
        <input
          value={line.descripcion}
          onChange={(e) => api.setLine(line.id, "descripcion", e.target.value)}
          maxLength={200}
          placeholder="Título del capítulo (p. ej. Cubierta principal)"
          className={`${cellInput} font-bold uppercase placeholder:normal-case`}
        />
      </label>
      <p className="col-span-2 flex items-center justify-between pl-[2.75rem] md:col-span-1 md:block md:pl-0 md:text-right">
        <span className="text-xs font-bold text-ink-400 md:hidden">Total del capítulo</span>
        <span className="font-extrabold text-ink-900 tabular-nums">{formatEuros(cents)}</span>
      </p>
      <div className="col-span-2 md:col-span-1">
        <RowActions line={line} index={index} total={total} api={api} />
      </div>
    </li>
  );
}

/* --------------------------------- Textos y firma --------------------------------- */

function TextArea({
  label,
  hint,
  value,
  onChange,
  max,
  rows = 4,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink-800">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-ink-400">{hint}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        className={`${field} resize-y leading-relaxed`}
      />
    </label>
  );
}

function TextsCard({ api }: { api: Editor }) {
  const q = api.quote;
  return (
    <section className={`${card} space-y-5`}>
      <h2 className="text-3xl font-bold">Textos</h2>
      <TextArea
        label="Introducción (opcional)"
        hint="Sale antes de las partidas."
        value={q.introduccion}
        onChange={(v) => api.setField("introduccion", v)}
        max={5000}
        rows={3}
        placeholder="Tras la visita realizada a la obra, le presentamos nuestra propuesta para…"
      />
      <TextArea
        label="Condiciones"
        hint="Una condición por línea. Las de los presupuestos nuevos se cambian en Ajustes."
        value={q.condiciones}
        onChange={(v) => api.setField("condiciones", v)}
        max={8000}
        rows={6}
      />
      <TextArea
        label="Notas internas"
        hint="Sólo para ti: no salen en el presupuesto."
        value={q.notas_internas}
        onChange={(v) => api.setField("notas_internas", v)}
        max={5000}
        rows={3}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-50 p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-ink-800">
          <input
            type="checkbox"
            className="size-5 accent-ink-900"
            checked={q.mostrar_firma}
            onChange={(e) => api.setField("mostrar_firma", e.target.checked)}
          />
          Poner el sello y la firma de Aislaser
        </label>
        <Link href="/panel/ajustes" className="flex items-center gap-1.5 text-sm font-bold text-ink-500 hover:text-ink-900">
          <Settings className="size-4" /> Sello, firma y condiciones por defecto
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------- Totales ------------------------------------- */

function TotalsCard({ quote }: { quote: Quote }) {
  const t = quoteTotals(quote);
  const items = quote.lineas.filter((l) => l.tipo === "partida").length;
  return (
    <section className="rounded-[1.75rem] bg-ink-950 p-6 text-white" aria-label="Totales">
      <p className="text-xs font-extrabold tracking-[0.18em] text-ink-400 uppercase">
        {items} {items === 1 ? "partida" : "partidas"}
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        {t.discount > 0 && (
          <>
            <div className="flex justify-between gap-4 text-ink-300">
              <dt>Suma de partidas</dt>
              <dd className="tabular-nums">{formatEuros(t.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-ink-300">
              <dt>Descuento ({formatPercent(quote.descuento)})</dt>
              <dd className="tabular-nums">−{formatEuros(t.discount)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between gap-4 text-ink-300">
          <dt>Base imponible</dt>
          <dd className="tabular-nums">{formatEuros(t.base)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-ink-300">
          <dt>IVA ({formatPercent(quote.iva)})</dt>
          <dd className="tabular-nums">{formatEuros(t.tax)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-3">
          <dt className="font-display text-xl font-bold">Total</dt>
          <dd className="font-display text-3xl font-bold text-laser-500 tabular-nums">{formatEuros(t.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
