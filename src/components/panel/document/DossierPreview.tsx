"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, LoaderCircle, Printer, TriangleAlert } from "lucide-react";
import type { Branding, Dossier } from "@/lib/dossier/types";
import { getBrandFontCss } from "./embedFonts";
import { BlockView, ContentPage, CoverPage, InformePage, LAYOUTS, PAGE_H, PAGE_W, buildBlocks, paginate, type PlacedBlock } from "./DossierDocument";

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

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/** Descarga una imagen con reintentos (cobertura mala) y la devuelve incrustada */
async function imageToDataUrl(src: string, tries = 3): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(src, { cache: i ? "reload" : "default" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.type && !blob.type.startsWith("image/")) throw new Error("No es una imagen");
      return await blobToDataUrl(blob);
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw lastError;
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function DossierPreview({ dossier, branding }: { dossier: Dossier; branding: Branding }) {
  const layout = LAYOUTS[dossier.template];
  const informe = dossier.template === "informe";
  const blocks = useMemo(() => buildBlocks(dossier, branding), [dossier, branding]);
  const measureRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PlacedBlock[][] | null>(null);
  const [scale, setScale] = useState(0.7);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // 1) Medir cada bloque con su tipografía real y 2) repartirlos en hojas A4
  useLayoutEffect(() => {
    let cancelled = false;
    const run = () => {
      const el = measureRef.current;
      if (!el || cancelled) return;
      const heights = Array.from(el.children).map((c) => (c as HTMLElement).getBoundingClientRect().height);
      setPages(paginate(blocks, heights, layout.contentH));
    };
    run();
    void document.fonts?.ready.then(run);
    return () => {
      cancelled = true;
    };
  }, [blocks, layout.contentH]);

  // Escala para que las hojas quepan en pantalla
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, (entry.contentRect.width - 2) / PAGE_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // El formato informe no tiene portada: todas las hojas llevan el membrete
  const totalPages = (pages?.length ?? 0) + (informe ? 0 : 1);
  const overflow = pages?.some((p) => p.some((b) => b.overflow));
  const baseName = `${slugify(dossier.title)}${dossier.reference ? `-${slugify(dossier.reference)}` : ""}`;

  async function renderPages(type: "jpeg" | "png", onProgress: (i: number, n: number) => void) {
    const { toJpeg, toPng } = await import("html-to-image");
    const nodes = Array.from(pagesRef.current?.querySelectorAll<HTMLElement>("[data-dossier-page]") ?? []);
    const fontEmbedCSS = await getBrandFontCss();

    // 1) Incrustar todas las fotos antes de capturar: si una falla, el resto del documento sale igual
    setBusy("Preparando las fotos…");
    const imgs = nodes.flatMap((n) => Array.from(n.querySelectorAll("img")));
    const originals = new Map<HTMLImageElement, string>();
    const bySrc = new Map<string, Promise<string | null>>();
    const missing: string[] = [];
    await Promise.all(
      imgs.map(async (img) => {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) return;
        if (!bySrc.has(src)) bySrc.set(src, imageToDataUrl(src).catch(() => null));
        const data = await bySrc.get(src);
        originals.set(img, src);
        img.src = data ?? TRANSPARENT_PIXEL;
        if (!data) missing.push(img.alt || "una foto");
        await img.decode().catch(() => undefined);
      }),
    );

    // 2) Capturar cada hoja
    try {
      const out: string[] = [];
      for (let i = 0; i < nodes.length; i++) {
        onProgress(i + 1, nodes.length);
        const opts = {
          pixelRatio: 2,
          width: PAGE_W,
          height: PAGE_H,
          backgroundColor: "#ffffff",
          fontEmbedCSS,
          quality: 0.92,
          imagePlaceholder: TRANSPARENT_PIXEL,
          includeQueryParams: true,
        };
        out.push(type === "jpeg" ? await toJpeg(nodes[i], opts) : await toPng(nodes[i], opts));
      }
      return { images: out, missing: [...new Set(missing)] };
    } finally {
      originals.forEach((src, img) => {
        img.src = src;
      });
    }
  }

  const reportMissing = (missing: string[]) =>
    setWarning(
      missing.length
        ? `Atención: ${missing.length === 1 ? "no se pudo incluir 1 foto" : `no se pudieron incluir ${missing.length} fotos`} (${missing
            .slice(0, 3)
            .join(", ")}${missing.length > 3 ? "…" : ""}). Comprueba la conexión y vuelve a descargar.`
        : null,
    );

  async function exportPdf() {
    setError(null);
    setWarning(null);
    try {
      const { images, missing } = await renderPages("jpeg", (i, n) => setBusy(`Preparando página ${i} de ${n}…`));
      reportMissing(missing);
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
    setWarning(null);
    try {
      const { images, missing } = await renderPages("png", (i, n) => setBusy(`Convirtiendo página ${i} de ${n} en imagen…`));
      reportMissing(missing);
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
        {(busy || error || warning || overflow) && (
          <div className="mx-auto mt-3 max-w-5xl space-y-2">
            {busy && (
              <p className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink-800 shadow-sm">
                <LoaderCircle className="size-4 animate-spin text-laser-600" /> {busy}
              </p>
            )}
            {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{error}</p>}
            {warning && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900" role="alert">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {warning}
              </p>
            )}
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
      <div aria-hidden="true" className="print:hidden" style={{ position: "absolute", left: -10000, top: 0, width: layout.contentW, visibility: "hidden" }} ref={measureRef}>
        {blocks.map((b) => (
          <div key={b.key} style={{ display: "flow-root" }}>
            <BlockView block={b} />
          </div>
        ))}
      </div>

      <div ref={wrapRef} className="mx-auto max-w-[794px]">
        <div id="dossier-pages" ref={pagesRef} className="space-y-6 print:space-y-0">
          {pages && informe &&
            pages.map((blocksOnPage, i) => (
              <ScaledPage key={i} scale={scale} label={`Página ${i + 1}`}>
                <InformePage blocks={blocksOnPage} pageNumber={i + 1} totalPages={totalPages} />
              </ScaledPage>
            ))}
          {pages && !informe && (
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
