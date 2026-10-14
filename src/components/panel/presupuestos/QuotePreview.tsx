"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Download, LoaderCircle, Printer, TriangleAlert } from "lucide-react";
import { PAGE_H, PAGE_W } from "@/components/panel/document/DossierDocument";
import { renderPages, savePdf, slugify } from "@/components/panel/document/exportPages";
import type { Branding } from "@/lib/dossier/types";
import { quoteNumber, type Quote } from "@/lib/presupuestos/types";
import { QUOTE_LAYOUT, QuoteBlockView, QuotePage, buildQuoteBlocks, paginateQuote, type PlacedQuoteBlock } from "./QuoteDocument";

export function QuotePreview({ quote, branding }: { quote: Quote; branding: Branding }) {
  const blocks = useMemo(() => buildQuoteBlocks(quote, branding), [quote, branding]);
  const measureRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PlacedQuoteBlock[][] | null>(null);
  const [scale, setScale] = useState(0.7);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Medir cada bloque con su tipografía real y repartirlos en hojas A4
  useLayoutEffect(() => {
    let cancelled = false;
    const run = () => {
      const el = measureRef.current;
      if (!el || cancelled) return;
      const heights = Array.from(el.children).map((c) => (c as HTMLElement).getBoundingClientRect().height);
      setPages(paginateQuote(blocks, heights, QUOTE_LAYOUT.contentH));
    };
    run();
    void document.fonts?.ready.then(run);
    return () => {
      cancelled = true;
    };
  }, [blocks]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, (entry.contentRect.width - 2) / PAGE_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalPages = pages?.length ?? 0;
  const overflow = pages?.some((p) => p.some((b) => b.overflow));
  const number = quoteNumber(quote);
  const baseName = `presupuesto-${number}${quote.cliente_nombre ? `-${slugify(quote.cliente_nombre)}` : ""}`;

  async function exportPdf() {
    setError(null);
    setWarning(null);
    try {
      const nodes = Array.from(pagesRef.current?.querySelectorAll<HTMLElement>("[data-dossier-page]") ?? []);
      const { images, missing } = await renderPages(nodes, "jpeg", {
        onStage: setBusy,
        onProgress: (i, n) => setBusy(`Preparando página ${i} de ${n}…`),
      });
      if (missing.length) setWarning("No se pudo incluir el sello o la firma. Comprueba la conexión y vuelve a descargar.");
      setBusy("Creando el PDF…");
      await savePdf(images, `${baseName}.pdf`, `Presupuesto ${number}`, "Panel de presupuestos Aislaser");
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el PDF. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="sticky z-20 -mx-4 mb-6 border-b border-ink-200 bg-ink-50/90 px-4 py-3 backdrop-blur print:hidden" style={{ top: "var(--ws-h, 0px)" }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink-700">{pages ? `${totalPages} ${totalPages === 1 ? "página" : "páginas"} · A4` : "Maquetando…"}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportPdf} disabled={!!busy || !pages} className="btn-primary !py-2.5 disabled:opacity-60">
              <Download className="size-4" /> Descargar PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!!busy || !pages}
              className="btn !py-2.5 border border-ink-300 bg-white text-ink-800 hover:border-ink-900 disabled:opacity-60"
            >
              <Printer className="size-4" /> Imprimir
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-5xl space-y-2 [&:not(:empty)]:mt-3" role="status" aria-live="polite">
          {busy && (
            <p className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink-800 shadow-sm">
              <LoaderCircle className="size-4 animate-spin text-laser-600" /> {busy}
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700" role="alert">
              {error}
            </p>
          )}
          {overflow && (
            <p className="flex items-start gap-2 rounded-xl bg-laser-500/15 px-4 py-2.5 text-sm font-semibold text-ink-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> Hay un texto tan largo que no cabe en una hoja y se cortaría. Divídelo en varias
              líneas (pulsando Intro) o en varias partidas.
            </p>
          )}
          {warning && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900" role="alert">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {warning}
            </p>
          )}
        </div>
      </div>

      {/* Contenedor invisible donde se mide la altura real de cada bloque */}
      <div
        aria-hidden="true"
        className="print:hidden"
        style={{ position: "absolute", left: -10000, top: 0, width: QUOTE_LAYOUT.contentW, visibility: "hidden" }}
        ref={measureRef}
      >
        {blocks.map((b) => (
          <div key={b.key} style={{ display: "flow-root" }}>
            <QuoteBlockView block={b} />
          </div>
        ))}
      </div>

      <div ref={wrapRef} className="mx-auto max-w-[794px]">
        <div id="dossier-pages" ref={pagesRef} className="space-y-6 print:space-y-0">
          {pages?.map((blocksOnPage, i) => (
            <div key={i} className="dossier-page-outer">
              <p className="mb-2 text-xs font-bold tracking-wider text-ink-400 uppercase print:hidden">Página {i + 1}</p>
              <div
                className="dossier-page-box overflow-hidden rounded-md bg-white shadow-[0_20px_50px_-20px_rgb(0_0_0/0.35)] ring-1 ring-ink-200"
                style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
              >
                <div className="dossier-page-scaler" style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <QuotePage blocks={blocksOnPage} pageNumber={i + 1} totalPages={totalPages} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
