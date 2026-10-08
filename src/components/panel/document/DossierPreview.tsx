"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, LoaderCircle, Printer, TriangleAlert } from "lucide-react";
import type { Dossier } from "@/lib/dossier/types";
import { getBrandFontCss } from "./embedFonts";
import { BlockView, CONTENT_W, ContentPage, CoverPage, PAGE_H, PAGE_W, buildBlocks, paginate, type PlacedBlock } from "./DossierDocument";

function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "dosier"
  );
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function DossierPreview({ dossier }: { dossier: Dossier }) {
  const blocks = useMemo(() => buildBlocks(dossier), [dossier]);
  const measureRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PlacedBlock[][] | null>(null);
  const [scale, setScale] = useState(0.7);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) Medir cada bloque con su tipografía real y 2) repartirlos en hojas A4
  useLayoutEffect(() => {
    let cancelled = false;
    const run = () => {
      const el = measureRef.current;
      if (!el || cancelled) return;
      const heights = Array.from(el.children).map((c) => (c as HTMLElement).getBoundingClientRect().height);
      setPages(paginate(blocks, heights));
    };
    run();
    void document.fonts?.ready.then(run);
    return () => {
      cancelled = true;
    };
  }, [blocks]);

  // Escala para que las hojas quepan en pantalla
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, (entry.contentRect.width - 2) / PAGE_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalPages = (pages?.length ?? 0) + 1;
  const overflow = pages?.some((p) => p.some((b) => b.overflow));
  const baseName = `${slugify(dossier.title)}${dossier.reference ? `-${slugify(dossier.reference)}` : ""}`;

  async function renderPages(type: "jpeg" | "png", onProgress: (i: number, n: number) => void) {
    const { toJpeg, toPng } = await import("html-to-image");
    const nodes = Array.from(pagesRef.current?.querySelectorAll<HTMLElement>("[data-dossier-page]") ?? []);
    const fontEmbedCSS = await getBrandFontCss();
    const out: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
      onProgress(i + 1, nodes.length);
      const opts = { pixelRatio: 2, width: PAGE_W, height: PAGE_H, backgroundColor: "#ffffff", fontEmbedCSS, quality: 0.92 };
      out.push(type === "jpeg" ? await toJpeg(nodes[i], opts) : await toPng(nodes[i], opts));
    }
    return out;
  }

  async function exportPdf() {
    setError(null);
    try {
      const images = await renderPages("jpeg", (i, n) => setBusy(`Preparando página ${i} de ${n}…`));
      setBusy("Creando el PDF…");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      images.forEach((img, i) => {
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      });
      pdf.setProperties({ title: dossier.title, author: "Aislaser", creator: "Panel de dosieres Aislaser" });
      pdf.save(`${baseName}.pdf`);
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el PDF. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function exportImages() {
    setError(null);
    try {
      const images = await renderPages("png", (i, n) => setBusy(`Convirtiendo página ${i} de ${n} en imagen…`));
      if (images.length === 1) {
        download(images[0], `${baseName}.png`);
      } else {
        setBusy("Comprimiendo imágenes…");
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        images.forEach((img, i) => zip.file(`${baseName}-pagina-${String(i + 1).padStart(2, "0")}.png`, img.split(",")[1], { base64: true }));
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        download(url, `${baseName}-imagenes.zip`);
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    } catch (e) {
      console.error(e);
      setError("No se pudieron generar las imágenes. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="sticky z-20 -mx-4 mb-6 border-b border-ink-200 bg-ink-50/90 px-4 py-3 backdrop-blur print:hidden" style={{ top: "var(--ws-h, 0px)" }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink-700">
            {pages ? `${totalPages} ${totalPages === 1 ? "página" : "páginas"} · A4` : "Maquetando…"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportPdf} disabled={!!busy || !pages} className="btn-primary !py-2.5 disabled:opacity-60">
              <Download className="size-4" /> Descargar PDF
            </button>
            <button type="button" onClick={exportImages} disabled={!!busy || !pages} className="btn-dark !py-2.5 disabled:opacity-60">
              <FileImage className="size-4" /> Descargar como imágenes
            </button>
            <button type="button" onClick={() => window.print()} disabled={!!busy || !pages} className="btn !py-2.5 border border-ink-300 bg-white text-ink-800 hover:border-ink-900 disabled:opacity-60">
              <Printer className="size-4" /> Imprimir
            </button>
          </div>
        </div>
        {(busy || error || overflow) && (
          <div className="mx-auto mt-3 max-w-5xl space-y-2">
            {busy && (
              <p className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink-800 shadow-sm">
                <LoaderCircle className="size-4 animate-spin text-laser-600" /> {busy}
              </p>
            )}
            {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{error}</p>}
            {overflow && (
              <p className="flex items-start gap-2 rounded-xl bg-laser-500/15 px-4 py-2.5 text-sm font-semibold text-ink-800">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> Hay un párrafo tan largo que no cabe en una página. Divídelo en varios
                párrafos (pulsando Intro) para que no se corte.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Contenedor invisible donde se mide la altura real de cada bloque */}
      <div aria-hidden="true" className="print:hidden" style={{ position: "absolute", left: -10000, top: 0, width: CONTENT_W, visibility: "hidden" }} ref={measureRef}>
        {blocks.map((b) => (
          <div key={b.key} style={{ display: "flow-root" }}>
            <BlockView block={b} />
          </div>
        ))}
      </div>

      <div ref={wrapRef} className="mx-auto max-w-[794px]">
        <div id="dossier-pages" ref={pagesRef} className="space-y-6 print:space-y-0">
          {pages && (
            <>
              <ScaledPage scale={scale} label="Portada">
                <CoverPage dossier={dossier} />
              </ScaledPage>
              {pages.map((blocksOnPage, i) => (
                <ScaledPage key={i} scale={scale} label={`Página ${i + 2}`}>
                  <ContentPage dossier={dossier} blocks={blocksOnPage} pageNumber={i + 2} totalPages={totalPages} />
                </ScaledPage>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScaledPage({ scale, label, children }: { scale: number; label: string; children: React.ReactNode }) {
  return (
    <div className="dossier-page-outer">
      <p className="mb-2 text-xs font-bold tracking-wider text-ink-400 uppercase print:hidden">{label}</p>
      <div
        className="dossier-page-box overflow-hidden rounded-md bg-white shadow-[0_20px_50px_-20px_rgb(0_0_0/0.35)] ring-1 ring-ink-200"
        style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
      >
        <div className="dossier-page-scaler" style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
