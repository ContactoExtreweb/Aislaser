/* eslint-disable @next/next/no-img-element */
import { Fragment } from "react";
import { LOGO_DARK_PATH, LOGO_VIEWBOX, LOGO_YELLOW_PATH } from "@/components/brand/logo-paths";
import { company } from "@/content/company";
import type { Dossier, DossierImage, ImageLayout } from "@/lib/dossier/types";

/* Medidas de una hoja A4 a 96 ppp (210 × 297 mm) */
export const PAGE_W = 794;
export const PAGE_H = 1122;
export const PAD_X = 64;
export const CONTENT_W = PAGE_W - PAD_X * 2;
const HEADER_H = 104;
const FOOTER_H = 78;
export const CONTENT_H = PAGE_H - HEADER_H - FOOTER_H;
const GAP = 12;

/* ------------------------------------------------------------------ */
/*  Bloques: unidades mínimas que se reparten entre las páginas        */
/* ------------------------------------------------------------------ */

export type Block =
  | { kind: "point"; key: string; number: number; title: string; spaceBefore: number; keepWithNext: true }
  | { kind: "html"; key: string; html: string; spaceBefore: number; keepWithNext?: false }
  | { kind: "images"; key: string; images: DossierImage[]; layout: ImageLayout; spaceBefore: number; keepWithNext?: false };

/** Divide el HTML del editor en párrafos y elementos de lista sueltos para poder paginarlo */
function splitHtml(html: string, keyPrefix: string, firstSpace: number): Block[] {
  if (!html.trim()) return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild!;
  const blocks: Block[] = [];
  let n = 0;
  const push = (h: string) => {
    blocks.push({ kind: "html", key: `${keyPrefix}-${n++}`, html: h, spaceBefore: blocks.length === 0 ? firstSpace : 7 });
  };
  Array.from(root.children).forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      const start = Number(el.getAttribute("start") || 1);
      Array.from(el.children).forEach((li, i) => {
        const attrs = tag === "ol" ? ` start="${start + i}"` : "";
        push(`<${tag}${attrs}>${li.outerHTML}</${tag}>`);
      });
    } else if (tag === "p" && !el.textContent?.trim()) {
      push(`<p>&nbsp;</p>`);
    } else {
      push(el.outerHTML);
    }
  });
  return blocks;
}

export function buildBlocks(dossier: Dossier): Block[] {
  const blocks: Block[] = [...splitHtml(dossier.intro, "intro", 0)];
  dossier.points.forEach((p, i) => {
    blocks.push({
      kind: "point",
      key: `point-${p.id}`,
      number: i + 1,
      title: p.title,
      spaceBefore: blocks.length ? 34 : 0,
      keepWithNext: true,
    });
    blocks.push(...splitHtml(p.body, `body-${p.id}`, 14));
    const perRow = p.image_layout === "grid-1" ? 1 : p.image_layout === "grid-2" ? 2 : 3;
    for (let r = 0; r < p.images.length; r += perRow) {
      blocks.push({
        kind: "images",
        key: `imgs-${p.id}-${r}`,
        images: p.images.slice(r, r + perRow),
        layout: p.image_layout,
        spaceBefore: 14,
      });
    }
  });
  return blocks;
}

export type PlacedBlock = { block: Block; space: number; overflow: boolean };

/** Reparte los bloques en páginas según su altura real medida */
export function paginate(blocks: Block[], heights: number[]): PlacedBlock[][] {
  const pages: PlacedBlock[][] = [];
  let current: PlacedBlock[] = [];
  let used = 0;
  blocks.forEach((block, i) => {
    const h = heights[i] ?? 0;
    let space = current.length ? block.spaceBefore : 0;
    let need = space + h;
    if (block.keepWithNext && i + 1 < blocks.length) need += blocks[i + 1].spaceBefore + (heights[i + 1] ?? 0);
    if (current.length && used + need > CONTENT_H) {
      pages.push(current);
      current = [];
      used = 0;
      space = 0;
    }
    current.push({ block, space, overflow: h > CONTENT_H });
    used += space + h;
  });
  if (current.length) pages.push(current);
  return pages;
}

/* ------------------------------------------------------------------ */
/*  Render                                                             */
/* ------------------------------------------------------------------ */

const font = {
  sans: "var(--font-mulish), system-ui, sans-serif",
  display: "var(--font-barlow), var(--font-mulish), system-ui, sans-serif",
};

function DocLogo({ height, white = false }: { height: number; white?: boolean }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} style={{ height, width: (height * 217) / 60, display: "block" }} aria-label="Aislaser">
      <path fill={white ? "#ffffff" : "#433f3f"} d={LOGO_DARK_PATH} />
      <path fill="#ffce00" d={LOGO_YELLOW_PATH} />
    </svg>
  );
}

function DocDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <span style={{ width: 6, height: 6, borderRadius: 9, background: "#433f3f" }} />
      <span style={{ width: 6, height: 6, borderRadius: 9, background: "#433f3f" }} />
      <span style={{ width: 6, height: 6, borderRadius: 9, background: "#ffce00" }} />
    </span>
  );
}

export function formatDate(date: string | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function imageBox(img: DossierImage, layout: ImageLayout) {
  if (layout === "grid-1") {
    const ratio = img.width && img.height ? img.height / img.width : 2 / 3;
    let h = Math.round(CONTENT_W * ratio);
    let w = CONTENT_W;
    if (h > 500) {
      h = 500;
      w = Math.round(h / ratio);
    }
    if (h < 220) h = 220;
    return { w, h, fit: "cover" as const };
  }
  const cols = layout === "grid-2" ? 2 : 3;
  const w = Math.floor((CONTENT_W - GAP * (cols - 1)) / cols);
  return { w, h: Math.round((w * 3) / 4), fit: "cover" as const };
}

export function BlockView({ block }: { block: Block }) {
  if (block.kind === "point") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 10, borderBottom: "1px solid #e3e0dd" }}>
        <span
          style={{
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 12,
            background: "#ffce00",
            color: "#242121",
            display: "grid",
            placeItems: "center",
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 25,
          }}
        >
          {block.number}
        </span>
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 26, lineHeight: 1.1, color: "#242121" }}>
          {block.title || `Punto ${block.number}`}
        </span>
      </div>
    );
  }
  if (block.kind === "html") {
    return (
      <div
        className="dossier-richtext"
        style={{ fontFamily: font.sans, fontSize: 12.5, lineHeight: 1.62, color: "#433f3f" }}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }
  const single = block.layout === "grid-1";
  return (
    <div style={{ display: "flex", gap: GAP, justifyContent: single ? "center" : "flex-start" }}>
      {block.images.map((img) => {
        const box = imageBox(img, block.layout);
        return (
          <figure key={img.id} style={{ margin: 0, width: box.w }}>
            <img
              src={img.url}
              alt={img.caption}
              crossOrigin="anonymous"
              style={{ width: box.w, height: box.h, objectFit: box.fit, borderRadius: 8, display: "block", background: "#f0eeeb" }}
            />
            {img.caption && (
              <figcaption style={{ marginTop: 5, fontFamily: font.sans, fontSize: 10, lineHeight: 1.35, fontStyle: "italic", color: "#767171" }}>
                {img.caption}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: PAGE_W,
  height: PAGE_H,
  background: "#ffffff",
  position: "relative",
  overflow: "hidden",
  fontFamily: font.sans,
  color: "#433f3f",
};

export function CoverPage({ dossier }: { dossier: Dossier }) {
  const info = [
    { label: "Cliente", value: dossier.client_name },
    { label: "Obra / ubicación", value: dossier.location },
    { label: "Fecha", value: formatDate(dossier.work_date) },
    { label: "Referencia", value: dossier.reference },
  ].filter((i) => i.value);

  return (
    <div data-dossier-page="" style={pageStyle}>
      <div style={{ height: 96, padding: `0 ${PAD_X}px`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <DocLogo height={34} />
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, fontWeight: 800, letterSpacing: "0.24em", color: "#767171" }}>
          DOSIER TÉCNICO <DocDots />
        </span>
      </div>

      <div style={{ position: "relative", height: 500, margin: `0 ${PAD_X}px`, borderRadius: 18, overflow: "hidden", background: "#242121" }}>
        {dossier.cover_url ? (
          <img src={dossier.cover_url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <svg viewBox="0 0 666 500" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true">
            <defs>
              <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.06)" />
              </pattern>
            </defs>
            <rect width="666" height="500" fill="url(#g)" />
            <path d="M420 40 L620 460 L575 460 L420 135 L265 460 L220 460 Z" fill="rgba(255,206,0,0.9)" />
          </svg>
        )}
        <span style={{ position: "absolute", left: 0, top: 36, width: 8, height: 90, background: "#ffce00" }} />
      </div>

      <div style={{ padding: `40px ${PAD_X}px 0` }}>
        {dossier.subtitle && (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#a88800" }}>{dossier.subtitle}</p>
        )}
        <h1 style={{ margin: "10px 0 0", fontFamily: font.display, fontWeight: 700, fontSize: 50, lineHeight: 1.0, color: "#181616", letterSpacing: "-0.01em" }}>
          {dossier.title || "Dosier sin título"}
        </h1>
        {info.length > 0 && (
          <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px", borderTop: "1px solid #e3e0dd", paddingTop: 20 }}>
            {info.map((i) => (
              <div key={i.label}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9f9a99" }}>{i.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#242121" }}>{i.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 74,
          background: "#242121",
          borderTop: "4px solid #ffce00",
          padding: `0 ${PAD_X}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#c8c4c2",
          fontSize: 10.5,
        }}
      >
        <DocLogo height={22} white />
        <span style={{ textAlign: "right", lineHeight: 1.5 }}>
          {company.phones.map((p) => p.label).join(" · ")} · {company.email}
          <br />
          {company.address.street} · {company.address.city} ({company.address.province}) · www.aislaser.es
        </span>
      </div>
    </div>
  );
}

export function ContentPage({
  dossier,
  blocks,
  pageNumber,
  totalPages,
}: {
  dossier: Dossier;
  blocks: PlacedBlock[];
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <div data-dossier-page="" style={pageStyle}>
      <div style={{ position: "absolute", top: 40, left: PAD_X, right: PAD_X }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <DocLogo height={22} />
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9f9a99",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 420,
            }}
          >
            {dossier.title}
            {dossier.reference ? ` · ${dossier.reference}` : ""}
          </span>
        </div>
        <div style={{ position: "relative", marginTop: 14, height: 1, background: "#e3e0dd" }}>
          <span style={{ position: "absolute", left: 0, top: -1, width: 44, height: 3, background: "#ffce00" }} />
        </div>
      </div>

      <div style={{ position: "absolute", top: HEADER_H, left: PAD_X, width: CONTENT_W, height: CONTENT_H, overflow: "hidden" }}>
        {blocks.map(({ block, space }) => (
          <Fragment key={block.key}>
            <div style={{ marginTop: space }}>
              <BlockView block={block} />
            </div>
          </Fragment>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: PAD_X,
          right: PAD_X,
          bottom: 34,
          borderTop: "1px solid #e3e0dd",
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9.5,
          color: "#9f9a99",
        }}
      >
        <span>
          <strong style={{ color: "#433f3f" }}>Aislaser</strong> · {company.phones[0].label} · {company.email} · www.aislaser.es
        </span>
        <span style={{ fontWeight: 700, color: "#433f3f" }}>
          {pageNumber} / {totalPages}
        </span>
      </div>
    </div>
  );
}
