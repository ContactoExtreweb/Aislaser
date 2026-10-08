/* eslint-disable @next/next/no-img-element */
import { LOGO_DARK_PATH, LOGO_VIEWBOX, LOGO_YELLOW_PATH } from "@/components/brand/logo-paths";
import { company } from "@/content/company";
import { sanitizedTopLevel } from "@/lib/dossier/sanitize";
import type { Branding, Dossier, DossierImage, DossierTemplate, ImageLayout } from "@/lib/dossier/types";

/* Medidas de una hoja A4 a 96 ppp (210 × 297 mm) */
export const PAGE_W = 794;
export const PAGE_H = 1122;
const GAP = 12;

export type PageLayout = { padLeft: number; contentTop: number; contentW: number; contentH: number };

/**
 * Márgenes de cada formato.
 * - informe: calcado del membrete de Aislaser (márgenes de Word de 3 cm, pie con actividades)
 * - portada: dosier fotográfico con cabecera y pie propios
 */
export const LAYOUTS: Record<DossierTemplate, PageLayout> = {
  informe: { padLeft: 113, contentTop: 150, contentW: PAGE_W - 113 * 2, contentH: 1040 - 150 },
  portada: { padLeft: 64, contentTop: 104, contentW: PAGE_W - 64 * 2, contentH: PAGE_H - 104 - 78 },
};

const INK = "#1d1b1b";
const LETTERHEAD_YELLOW = "#ffc000"; // amarillo del membrete original
const HIGHLIGHT = "#ffce00"; // amarillo de marca para el título resaltado

const font = {
  sans: "var(--font-mulish), system-ui, sans-serif",
  display: "var(--font-barlow), var(--font-mulish), system-ui, sans-serif",
};

/* ------------------------------------------------------------------ */
/*  Bloques: unidades mínimas que se reparten entre las páginas        */
/* ------------------------------------------------------------------ */

type BlockBase = { key: string; spaceBefore: number; keepWithNext?: boolean; template: DossierTemplate };

export type Block =
  | (BlockBase & { kind: "addressee"; lines: { label: string; value: string }[]; topGap: number })
  | (BlockBase & { kind: "title"; title: string; topGap: number })
  | (BlockBase & { kind: "point"; number: number; title: string })
  | (BlockBase & { kind: "html"; html: string })
  | (BlockBase & { kind: "images"; images: DossierImage[]; layout: ImageLayout; contentW: number })
  | (BlockBase & { kind: "closing"; text: string; signer: string; branding: Branding; showSignature: boolean });

/** Divide el HTML del editor en párrafos y elementos de lista sueltos para poder paginarlo */
function splitHtml(html: string, keyPrefix: string, firstSpace: number, template: DossierTemplate, gap: number): Block[] {
  if (!html.trim()) return [];
  const blocks: Block[] = [];
  let n = 0;
  const push = (h: string) => {
    blocks.push({ kind: "html", key: `${keyPrefix}-${n++}`, html: h, spaceBefore: blocks.length === 0 ? firstSpace : gap, template });
  };
  // HTML ya limpio: sólo párrafos, listas y formato básico
  sanitizedTopLevel(html).forEach((el) => {
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

export function formatDate(date: string | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function closingText(dossier: Dossier) {
  const place = dossier.issue_place.trim();
  const date = formatDate(dossier.work_date);
  if (dossier.template === "informe") {
    return `Se emite este informe técnico${place ? ` en ${place}` : ""}${date ? ` a ${date}` : ""}`;
  }
  return [place, date ? `a ${date}` : ""].filter(Boolean).join(", ");
}

export function buildBlocks(dossier: Dossier, branding: Branding): Block[] {
  const template = dossier.template;
  const layout = LAYOUTS[template];
  const informe = template === "informe";
  const blocks: Block[] = [];

  if (informe) {
    const lines = [
      { label: "A/A del técnico:", value: dossier.attention },
      { label: "INFORME REALIZADO POR:", value: dossier.prepared_by },
      { label: "PARA:", value: dossier.client_name },
    ].filter((l) => l.value.trim());
    if (lines.length) blocks.push({ kind: "addressee", key: "addressee", lines, topGap: 49, spaceBefore: 0, template });
    // Si no hay líneas de cabecera, el hueco bajo el membrete va dentro del propio título
    blocks.push({ kind: "title", key: "title", title: dossier.title, topGap: lines.length ? 0 : 49, spaceBefore: lines.length ? 12 : 0, template });
  }

  blocks.push(...splitHtml(dossier.intro, "intro", blocks.length ? 16 : 0, template, informe ? 10 : 7));

  dossier.points.forEach((p, i) => {
    blocks.push({
      kind: "point",
      key: `point-${p.id}`,
      number: i + 1,
      title: p.title,
      spaceBefore: blocks.length ? (informe ? 10 : 34) : 0,
      keepWithNext: true,
      template,
    });
    blocks.push(...splitHtml(p.body, `body-${p.id}`, informe ? 12 : 14, template, informe ? 10 : 7));
    const perRow = p.image_layout === "grid-1" ? 1 : p.image_layout === "grid-2" ? 2 : 3;
    for (let r = 0; r < p.images.length; r += perRow) {
      blocks.push({
        kind: "images",
        key: `imgs-${p.id}-${r}`,
        images: p.images.slice(r, r + perRow),
        layout: p.image_layout,
        contentW: layout.contentW,
        spaceBefore: 14,
        template,
      });
    }
  });

  if (informe || dossier.show_signature) {
    blocks.push({
      kind: "closing",
      key: "closing",
      text: closingText(dossier),
      signer: dossier.signer_name.trim() || branding.signerName,
      branding,
      showSignature: dossier.show_signature,
      spaceBefore: blocks.length ? 24 : 0,
      template,
    });
  }
  return blocks;
}

export type PlacedBlock = { block: Block; space: number; overflow: boolean };

/** Reparte los bloques en páginas según su altura real medida */
export function paginate(blocks: Block[], heights: number[], contentH: number): PlacedBlock[][] {
  const pages: PlacedBlock[][] = [];
  let current: PlacedBlock[] = [];
  let used = 0;
  blocks.forEach((block, i) => {
    const h = heights[i] ?? 0;
    let space = current.length ? block.spaceBefore : 0;
    let need = space + h;
    if (block.keepWithNext && i + 1 < blocks.length) need += blocks[i + 1].spaceBefore + (heights[i + 1] ?? 0);
    if (current.length && used + need > contentH) {
      pages.push(current);
      current = [];
      used = 0;
      space = 0;
    }
    current.push({ block, space, overflow: h > contentH });
    used += space + h;
  });
  if (current.length) pages.push(current);
  return pages;
}

/* ------------------------------------------------------------------ */
/*  Render de bloques                                                  */
/* ------------------------------------------------------------------ */

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

function imageBox(img: DossierImage, layout: ImageLayout, contentW: number) {
  if (layout === "grid-1") {
    const ratio = img.width && img.height ? img.height / img.width : 2 / 3;
    let h = Math.round(contentW * ratio);
    let w = contentW;
    const maxH = Math.round(contentW * 0.62);
    if (h > maxH) {
      h = maxH;
      w = Math.round(h / ratio);
    }
    if (h < 200) h = 200;
    return { w, h };
  }
  const cols = layout === "grid-2" ? 2 : 3;
  const w = Math.floor((contentW - GAP * (cols - 1)) / cols);
  return { w, h: Math.round((w * 3) / 4) };
}

// Equivalente visual al Calibri 11 pt de los informes originales
const informeText: React.CSSProperties = { fontFamily: font.sans, fontSize: 13.5, lineHeight: 1.5, color: INK };

export function BlockView({ block }: { block: Block }) {
  const informe = block.template === "informe";

  switch (block.kind) {
    case "addressee":
      return (
        <div style={{ ...informeText, paddingTop: block.topGap }}>
          {block.lines.map((l, i) => (
            <p key={l.label} style={{ margin: i ? "10px 0 0" : 0 }}>
              {l.label}&nbsp; {l.value}
            </p>
          ))}
        </div>
      );

    case "title":
      return (
        <p style={{ ...informeText, margin: 0, paddingTop: block.topGap, textAlign: "center", fontWeight: 800 }}>
          <span style={{ background: HIGHLIGHT, padding: "1px 4px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
            {block.title || "Título del informe"}
          </span>
        </p>
      );

    case "point":
      if (informe) {
        return (
          <div style={{ ...informeText, display: "flex", gap: 16, paddingLeft: 26, fontWeight: 400, textTransform: "uppercase" }}>
            <span style={{ minWidth: 14 }}>{block.number}.</span>
            <span>{block.title || `Punto ${block.number}`}</span>
          </div>
        );
      }
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

    case "html":
      return (
        <div
          className="dossier-richtext"
          style={
            informe
              ? { ...informeText, textAlign: "justify" }
              : { fontFamily: font.sans, fontSize: 12.5, lineHeight: 1.62, color: "#433f3f" }
          }
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );

    case "images": {
      const single = block.layout === "grid-1";
      return (
        <div style={{ display: "flex", gap: GAP, justifyContent: single ? "center" : "flex-start" }}>
          {block.images.map((img) => {
            const box = imageBox(img, block.layout, block.contentW);
            return (
              <figure key={img.id} style={{ margin: 0, width: box.w }}>
                <img
                  src={img.url}
                  alt={img.caption}
                  crossOrigin="anonymous"
                  style={{ width: box.w, height: box.h, objectFit: "cover", borderRadius: informe ? 4 : 8, display: "block", background: "#f0eeeb" }}
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

    case "closing": {
      const { stampUrl, signatureUrl, signerCompany } = block.branding;
      const hasImages = block.showSignature && (stampUrl || signatureUrl);
      const text = informe ? informeText : { fontFamily: font.sans, fontSize: 12.5, lineHeight: 1.55, color: "#433f3f" };
      const signer = block.signer.endsWith(".") ? block.signer : `${block.signer}.`;
      return (
        <div style={text}>
          {block.text && <p style={{ margin: 0 }}>{block.text}</p>}
          {hasImages ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 26, height: 104, marginTop: 30, marginLeft: -18 }}>
              {stampUrl && <img src={stampUrl} alt="Sello" crossOrigin="anonymous" style={{ height: 100, maxWidth: 110, objectFit: "contain" }} />}
              {signatureUrl && (
                <img src={signatureUrl} alt="Firma" crossOrigin="anonymous" style={{ height: 92, maxWidth: 170, objectFit: "contain" }} />
              )}
            </div>
          ) : (
            // Hueco para firmar a mano si se imprime
            <div style={{ height: block.showSignature ? 70 : 24 }} />
          )}
          <p style={{ margin: "8px 0 0" }}>FDO: {signerCompany}</p>
          <p style={{ margin: "12px 0 0" }}>{signer}</p>
        </div>
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Páginas                                                            */
/* ------------------------------------------------------------------ */

const pageStyle: React.CSSProperties = {
  width: PAGE_W,
  height: PAGE_H,
  background: "#ffffff",
  position: "relative",
  overflow: "hidden",
  fontFamily: font.sans,
  color: "#433f3f",
};

function PageBlocks({ blocks, layout }: { blocks: PlacedBlock[]; layout: PageLayout }) {
  return (
    <div style={{ position: "absolute", top: layout.contentTop, left: layout.padLeft, width: layout.contentW, height: layout.contentH, overflow: "hidden" }}>
      {blocks.map(({ block, space }) => (
        <div key={block.key} style={{ marginTop: space }}>
          <BlockView block={block} />
        </div>
      ))}
    </div>
  );
}

/** Hoja con el membrete del informe técnico de Aislaser */
export function InformePage({ blocks, pageNumber, totalPages }: { blocks: PlacedBlock[]; pageNumber: number; totalPages: number }) {
  const layout = LAYOUTS.informe;
  return (
    <div data-dossier-page="" style={pageStyle}>
      {/* Membrete */}
      {/* Posiciones medidas sobre el informe original (logo x≈117 y≈11, lema x≈114 y≈69) */}
      <div style={{ position: "absolute", top: 10, left: 116 }}>
        <DocLogo height={39} />
      </div>
      <p style={{ position: "absolute", top: 67, left: 113, margin: 0, fontSize: 11.5, lineHeight: 1, color: LETTERHEAD_YELLOW, letterSpacing: "0.01em" }}>
        {company.letterheadTagline}
      </p>
      {totalPages > 1 && (
        <p style={{ position: "absolute", top: 44, right: layout.padLeft, margin: 0, fontSize: 9.5, color: "#9f9a99" }}>
          Página {pageNumber} de {totalPages}
        </p>
      )}

      {/* Registro y CIF en el margen izquierdo, como en el membrete original */}
      <p
        style={{
          position: "absolute",
          left: 54,
          top: 610,
          margin: 0,
          transform: "translate(-50%, -50%) rotate(-90deg)",
          whiteSpace: "nowrap",
          fontSize: 9,
          color: "#1f3864",
          letterSpacing: "0.02em",
        }}
      >
        Nº Registro. {company.registry} – C.I.F: {company.cif}
      </p>

      <PageBlocks blocks={blocks} layout={layout} />

      {/* Pie del membrete */}
      <div style={{ position: "absolute", left: 18, right: 18, top: 1060, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 8.3, color: LETTERHEAD_YELLOW, textDecoration: "underline", textUnderlineOffset: 2, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
          {company.activities.join("-")}
        </p>
        <p style={{ margin: "9px 0 0", fontSize: 9.5, color: "#000000" }}>
          Polígono Industrial. Nave, 2 y 3 – Tel./Fax {company.landline.label} – Móvil. {company.phones[0].label} –{" "}
          {company.address.postalCode} <strong>{company.address.city.toUpperCase()}</strong> ({company.address.province})
        </p>
      </div>
    </div>
  );
}

export function CoverPage({ dossier }: { dossier: Dossier }) {
  const pad = LAYOUTS.portada.padLeft;
  const info = [
    { label: "Cliente", value: dossier.client_name },
    { label: "Obra / ubicación", value: dossier.location },
    { label: "Fecha", value: formatDate(dossier.work_date) },
    { label: "Referencia", value: dossier.reference },
  ].filter((i) => i.value);

  return (
    <div data-dossier-page="" style={pageStyle}>
      <div style={{ height: 96, padding: `0 ${pad}px`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <DocLogo height={34} />
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, fontWeight: 800, letterSpacing: "0.24em", color: "#767171" }}>
          DOSIER TÉCNICO <DocDots />
        </span>
      </div>

      <div style={{ position: "relative", height: 500, margin: `0 ${pad}px`, borderRadius: 18, overflow: "hidden", background: "#242121" }}>
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

      <div style={{ padding: `40px ${pad}px 0` }}>
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
          padding: `0 ${pad}px`,
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
  const layout = LAYOUTS.portada;
  return (
    <div data-dossier-page="" style={pageStyle}>
      <div style={{ position: "absolute", top: 40, left: layout.padLeft, right: layout.padLeft }}>
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

      <PageBlocks blocks={blocks} layout={layout} />

      <div
        style={{
          position: "absolute",
          left: layout.padLeft,
          right: layout.padLeft,
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
