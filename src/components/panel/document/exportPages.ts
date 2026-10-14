"use client";

import { getBrandFontCss } from "./embedFonts";
import { PAGE_H, PAGE_W } from "./DossierDocument";

/** Exportación de hojas A4 (informes, dosieres y presupuestos) a imágenes y PDF */

export function slugify(text: string, fallback = "documento") {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || fallback
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

export function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Convierte cada hoja ([data-dossier-page]) en una imagen. Antes incrusta todas las fotos:
 * si una falla, el resto del documento sale igual y se devuelve en «missing».
 */
export async function renderPages(
  nodes: HTMLElement[],
  type: "jpeg" | "png",
  { onStage, onProgress }: { onStage: (text: string) => void; onProgress: (i: number, n: number) => void },
) {
  const { toJpeg, toPng } = await import("html-to-image");
  const fontEmbedCSS = await getBrandFontCss();

  onStage("Preparando las fotos…");
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

/** Une las imágenes de las hojas en un PDF A4 y lo descarga */
export async function savePdf(images: string[], filename: string, title: string, creator: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  images.forEach((img, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
  });
  pdf.setProperties({ title, author: "Aislaser", creator });
  pdf.save(filename);
}
