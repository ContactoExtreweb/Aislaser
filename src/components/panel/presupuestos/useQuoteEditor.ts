"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { LINE_COLUMNS, type LineFields, type Quote, type QuoteFields, type QuoteLine } from "@/lib/presupuestos/types";
import { useSaveQueue } from "./useSaveQueue";

/** Una actualización que no toca ninguna fila no es un éxito: sesión caducada o elemento borrado */
const NOT_SAVED = "No se guardó: la sesión ha caducado o el elemento ya no existe. Recarga la página.";
function expectRows({ data, error }: { data: unknown[] | null; error: { message: string } | null }) {
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(NOT_SAVED);
}

/**
 * Última versión conocida de cada presupuesto en esta pestaña: al volver con «Atrás», Next
 * reutiliza la página cacheada con datos antiguos y la siguiente edición los machacaría.
 * Se reutiliza sólo si el servidor trae exactamente los datos con los que se abrió.
 */
const latestById = new Map<string, { quote: Quote; seededFrom: string }>();

function initialState(initial: Quote) {
  const cached = latestById.get(initial.id);
  if (cached && cached.seededFrom === initial.updated_at) return cached.quote;
  latestById.set(initial.id, { quote: initial, seededFrom: initial.updated_at });
  return initial;
}

const toLine = (row: Record<string, unknown>): QuoteLine => ({
  ...(row as QuoteLine),
  cantidad: Number(row.cantidad ?? 0),
  precio: Number(row.precio ?? 0),
});

export function useQuoteEditor(initial: Quote) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const queue = useSaveQueue();
  const { runKeyed, debounce, attempt, cancel } = queue;
  const [quote, setQuote] = useState<Quote>(() => initialState(initial));
  const quoteRef = useRef(quote);
  const seededFrom = useRef(latestById.get(initial.id)?.seededFrom ?? initial.updated_at);

  const apply = useCallback((fn: (q: Quote) => Quote) => {
    quoteRef.current = fn(quoteRef.current);
    latestById.set(quoteRef.current.id, { quote: quoteRef.current, seededFrom: seededFrom.current });
    setQuote(quoteRef.current);
  }, []);

  const setField = useCallback(
    <K extends keyof QuoteFields>(field: K, value: QuoteFields[K]) => {
      apply((q) => ({ ...q, [field]: value }));
      debounce(`quote.${field}`, async () => {
        expectRows(await supabase.from("presupuestos").update({ [field]: value }).eq("id", quoteRef.current.id).select("id"));
      });
    },
    [apply, debounce, supabase],
  );

  const setLine = useCallback(
    <K extends keyof LineFields>(id: string, field: K, value: LineFields[K]) => {
      apply((q) => ({ ...q, lineas: q.lineas.map((l) => (l.id === id ? { ...l, [field]: value } : l)) }));
      debounce(`line.${id}.${field}`, async () => {
        expectRows(await supabase.from("presupuesto_partidas").update({ [field]: value }).eq("id", id).select("id"));
      });
    },
    [apply, debounce, supabase],
  );

  /** Fija el orden en pantalla y guarda todas las posiciones */
  const commitOrder = useCallback(
    (lines: QuoteLine[]) => {
      const ordered = lines.map((l, i) => ({ ...l, orden: i }));
      apply((q) => ({ ...q, lineas: ordered }));
      const items = ordered.map((l) => ({ id: l.id, orden: l.orden }));
      if (!items.length) return;
      void runKeyed("order", async () => {
        const results = await Promise.all(items.map((it) => supabase.from("presupuesto_partidas").update({ orden: it.orden }).eq("id", it.id).select("id")));
        results.forEach(expectRows);
      });
    },
    [apply, runKeyed, supabase],
  );

  /** Añade una partida o un capítulo (por defecto al final) y devuelve su id */
  const addLine = useCallback(
    async (fields: Partial<LineFields> = {}, index?: number) => {
      const q = quoteRef.current;
      const at = index ?? q.lineas.length;
      const row = {
        presupuesto_id: q.id,
        orden: at,
        tipo: fields.tipo ?? "partida",
        descripcion: fields.descripcion ?? "",
        unidad: fields.unidad ?? (fields.tipo === "capitulo" ? "" : "m²"),
        cantidad: fields.cantidad ?? 1,
        precio: fields.precio ?? 0,
      };
      const created = await attempt(async () => {
        const { data, error } = await supabase.from("presupuesto_partidas").insert(row).select(LINE_COLUMNS).single();
        if (error || !data) throw new Error(error?.message ?? "No se pudo añadir la partida.");
        return toLine(data);
      });
      if (!created.ok) return null;
      const lines = [...quoteRef.current.lineas];
      lines.splice(Math.min(at, lines.length), 0, created.value);
      commitOrder(lines);
      return created.value.id;
    },
    [attempt, commitOrder, supabase],
  );

  const duplicateLine = useCallback(
    (id: string) => {
      const index = quoteRef.current.lineas.findIndex((l) => l.id === id);
      const src = quoteRef.current.lineas[index];
      if (!src) return Promise.resolve(null);
      return addLine({ tipo: src.tipo, descripcion: src.descripcion, unidad: src.unidad, cantidad: src.cantidad, precio: src.precio }, index + 1);
    },
    [addLine],
  );

  const deleteLine = useCallback(
    async (id: string) => {
      const before = quoteRef.current.lineas;
      cancel(`line.${id}.`);
      apply((q) => ({ ...q, lineas: q.lineas.filter((l) => l.id !== id) }));
      const result = await attempt(async () => {
        const { error } = await supabase.from("presupuesto_partidas").delete().eq("id", id);
        if (error) throw new Error(error.message);
      });
      if (!result.ok) {
        apply((q) => ({ ...q, lineas: before }));
        return;
      }
      commitOrder(quoteRef.current.lineas);
    },
    [apply, attempt, cancel, commitOrder, supabase],
  );

  const moveLine = useCallback(
    (id: string, delta: -1 | 1) => {
      const lines = [...quoteRef.current.lineas];
      const i = lines.findIndex((l) => l.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= lines.length) return;
      [lines[i], lines[j]] = [lines[j], lines[i]];
      commitOrder(lines);
    },
    [commitOrder],
  );

  return { quote, save: queue.save, retryAll: queue.retryAll, setField, setLine, addLine, duplicateLine, deleteLine, moveLine };
}
