/* eslint-disable @next/next/no-img-element */
import { LAYOUTS, LetterheadPage, formatDate } from "@/components/panel/document/DossierDocument";
import { company } from "@/content/company";
import type { Branding } from "@/lib/dossier/types";
import { addDays, formatEuros, formatPercent, formatQuantity, isPrintable, lineCents, quoteNumber, quoteTotals, type Quote, type QuoteLine } from "@/lib/presupuestos/types";

/* El presupuesto va sobre el mismo membrete que los informes técnicos (caja de LAYOUTS.informe) */
export const QUOTE_LAYOUT = LAYOUTS.informe;

const INK = "#1d1b1b";
const MUTED = "#6f6a69";
const LINE = "#d9d4d0";
const YELLOW = "#ffce00";
const font = {
  sans: "var(--font-mulish), system-ui, sans-serif",
  display: "var(--font-barlow), var(--font-mulish), system-ui, sans-serif",
};
const text: React.CSSProperties = { fontFamily: font.sans, fontSize: 12.5, lineHeight: 1.5, color: INK };
const small: React.CSSProperties = { fontFamily: font.sans, fontSize: 11, lineHeight: 1.45, color: INK };

/* Columnas de la tabla: nº · descripción · ud. · cantidad · precio · importe */
const COLS = [34, 0, 38, 62, 74, 86] as const;
const colStyle = (i: number): React.CSSProperties =>
  i === 1 ? { flex: 1, minWidth: 0, paddingRight: 10 } : { width: COLS[i], flexShrink: 0, textAlign: i === 0 ? "left" : "right" };

/* ------------------------------------------------------------------ */
/*  Bloques                                                            */
/* ------------------------------------------------------------------ */

type Base = { key: string; space: number; keepWithNext?: boolean; inTable?: boolean };
export type QuoteBlock =
  | (Base & { kind: "head"; quote: Quote })
  | (Base & { kind: "subject"; obra: string; ubicacion: string })
  | (Base & { kind: "para"; text: string })
  | (Base & { kind: "tableHead" })
  | (Base & { kind: "chapter"; number: string; title: string })
  | (Base & { kind: "line"; number: string; line: QuoteLine })
  | (Base & { kind: "chapterTotal"; title: string; cents: number })
  | (Base & { kind: "totals"; quote: Quote })
  | (Base & { kind: "title"; text: string })
  | (Base & { kind: "condition"; text: string })
  | (Base & { kind: "signatures"; branding: Branding; showSignature: boolean });

const paragraphs = (s: string) =>
  s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

export function buildQuoteBlocks(quote: Quote, branding: Branding): QuoteBlock[] {
  const blocks: QuoteBlock[] = [{ kind: "head", key: "head", quote, space: 0 }];
  if (quote.obra.trim() || quote.ubicacion.trim()) blocks.push({ kind: "subject", key: "subject", obra: quote.obra, ubicacion: quote.ubicacion, space: 22 });
  paragraphs(quote.introduccion).forEach((p, i) => blocks.push({ kind: "para", key: `intro-${i}`, text: p, space: i ? 8 : 18 }));

  const lines = quote.lineas.filter(isPrintable);
  const totals = quoteTotals(quote);
  if (lines.length) {
    blocks.push({ kind: "tableHead", key: "thead", space: 22, keepWithNext: true, inTable: true });
    let chapter = 0;
    let item = 0;
    let open: QuoteLine | null = null;
    const closeChapter = () => {
      if (!open) return;
      blocks.push({ kind: "chapterTotal", key: `ct-${open.id}`, title: open.descripcion, cents: totals.chapters[open.id] ?? 0, space: 0, inTable: true });
      open = null;
    };
    for (const l of lines) {
      if (l.tipo === "capitulo") {
        closeChapter();
        chapter += 1;
        item = 0;
        open = l;
        blocks.push({
          kind: "chapter",
          key: `ch-${l.id}`,
          number: String(chapter),
          title: l.descripcion,
          space: chapter > 1 ? 10 : 0,
          keepWithNext: true,
          inTable: true,
        });
      } else {
        item += 1;
        blocks.push({ kind: "line", key: `l-${l.id}`, number: chapter ? `${chapter}.${item}` : String(item), line: l, space: 0, inTable: true });
      }
    }
    closeChapter();
  }
  blocks.push({ kind: "totals", key: "totals", quote, space: 18 });

  const conditions = paragraphs(quote.condiciones);
  if (conditions.length) {
    blocks.push({ kind: "title", key: "cond-title", text: "Condiciones", space: 26, keepWithNext: true });
    conditions.forEach((c, i) => blocks.push({ kind: "condition", key: `cond-${i}`, text: c, space: i ? 4 : 8 }));
  }
  blocks.push({ kind: "signatures", key: "signatures", branding, showSignature: quote.mostrar_firma, space: 30 });
  return blocks;
}

export type PlacedQuoteBlock = { block: QuoteBlock; space: number; repeatHead?: boolean; overflow?: boolean };

/**
 * Reparte los bloques en hojas según su altura medida. Si la tabla sigue en la hoja siguiente,
 * ésta empieza repitiendo la cabecera de columnas.
 */
export function paginateQuote(blocks: QuoteBlock[], heights: number[], contentH: number): PlacedQuoteBlock[][] {
  const headIndex = blocks.findIndex((b) => b.kind === "tableHead");
  const headH = headIndex >= 0 ? heights[headIndex] : 0;
  const pages: PlacedQuoteBlock[][] = [];
  let current: PlacedQuoteBlock[] = [];
  let used = 0;
  blocks.forEach((block, i) => {
    const h = heights[i] ?? 0;
    let space = current.length ? block.space : 0;
    // Lo que debe ir en la misma hoja: este bloque y los encadenados con keepWithNext
    // (cabecera de la tabla → capítulo → su primera partida)
    let need = space + h;
    for (let j = i; blocks[j].keepWithNext && j + 1 < blocks.length; j++) need += blocks[j + 1].space + (heights[j + 1] ?? 0);
    // Una hoja que sólo tiene la cabecera repetida no se cierra: el bloque va ahí aunque no quepa entero
    const onlyRepeatedHead = current.length > 0 && current.every((c) => c.repeatHead);
    if (current.length && !onlyRepeatedHead && used + need > contentH) {
      pages.push(current);
      current = [];
      used = 0;
      space = 0;
      // Continúa la tabla: cabecera de columnas otra vez
      if (block.inTable && block.kind !== "tableHead" && headIndex >= 0) {
        current.push({ block: blocks[headIndex], space: 0, repeatHead: true });
        used = headH;
      }
    }
    current.push({ block, space, overflow: h > contentH });
    used += space + h;
  });
  if (current.length) pages.push(current);
  return pages;
}

/* ------------------------------------------------------------------ */
/*  Render                                                             */
/* ------------------------------------------------------------------ */

function Row({ cells, style }: { cells: React.ReactNode[]; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", ...small, ...style }}>
      {cells.map((c, i) => (
        <div key={i} style={colStyle(i)}>
          {c}
        </div>
      ))}
    </div>
  );
}

export function QuoteBlockView({ block }: { block: QuoteBlock }) {
  switch (block.kind) {
    case "head": {
      const q = block.quote;
      const client = [
        q.cliente_nombre,
        q.cliente_nif && `NIF/CIF: ${q.cliente_nif}`,
        q.cliente_direccion,
        [q.cliente_telefono, q.cliente_email].filter(Boolean).join(" · "),
        q.atencion && `A/A: ${q.atencion}`,
      ].filter(Boolean) as string[];
      return (
        <div style={{ display: "flex", gap: 24, paddingTop: 24 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 30, lineHeight: 1, letterSpacing: "0.02em", color: INK }}>
              PRESUPUESTO
            </p>
            <div style={{ marginTop: 6, width: 46, height: 4, background: YELLOW }} />
            <table style={{ ...text, marginTop: 12, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Nº", quoteNumber(q)],
                  ["Fecha", formatDate(q.fecha)],
                  ["Válido hasta", formatDate(addDays(q.fecha, q.validez_dias))],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "1px 12px 1px 0", color: MUTED }}>{k}</td>
                    <td style={{ padding: "1px 0", fontWeight: 700 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ width: 268, border: `1px solid ${LINE}`, borderRadius: 6, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED, fontFamily: font.sans }}>
              Cliente
            </p>
            {client.length ? (
              client.map((c, i) => (
                <p
                  key={i}
                  style={{
                    ...small,
                    margin: i ? "2px 0 0" : "5px 0 0",
                    fontWeight: i === 0 ? 800 : 400,
                    fontSize: i === 0 ? 12.5 : 11,
                    overflowWrap: "anywhere",
                  }}
                >
                  {c}
                </p>
              ))
            ) : (
              <p style={{ ...small, margin: "5px 0 0", color: MUTED }}>—</p>
            )}
          </div>
        </div>
      );
    }

    case "subject":
      return (
        <div style={{ ...text, borderLeft: `3px solid ${YELLOW}`, paddingLeft: 12 }}>
          {block.obra && (
            <p style={{ margin: 0 }}>
              <span style={{ color: MUTED }}>Obra: </span>
              <strong>{block.obra}</strong>
            </p>
          )}
          {block.ubicacion && (
            <p style={{ margin: block.obra ? "2px 0 0" : 0 }}>
              <span style={{ color: MUTED }}>Ubicación: </span>
              {block.ubicacion}
            </p>
          )}
        </div>
      );

    case "para":
      return <p style={{ ...text, margin: 0, textAlign: "justify", whiteSpace: "pre-wrap" }}>{block.text}</p>;

    case "tableHead":
      return (
        <Row
          cells={["Nº", "Descripción", "Ud.", "Cantidad", "Precio", "Importe"]}
          style={{
            background: "#2e2b2b",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "6px 8px",
            borderRadius: 4,
          }}
        />
      );

    case "chapter":
      return (
        <Row
          cells={[block.number, block.title || "Capítulo sin título", "", "", "", ""]}
          style={{ fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", padding: "8px 8px 6px", borderBottom: `1.5px solid ${INK}` }}
        />
      );

    case "line": {
      const l = block.line;
      return (
        <Row
          cells={[
            block.number,
            <span key="d" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {l.descripcion || "—"}
            </span>,
            l.unidad,
            formatQuantity(l.cantidad),
            formatEuros(Math.round(l.precio * 100)),
            <strong key="i">{formatEuros(lineCents(l))}</strong>,
          ]}
          style={{ padding: "6px 8px", borderBottom: `1px solid ${LINE}` }}
        />
      );
    }

    case "chapterTotal":
      return (
        <Row
          cells={["", `Total ${block.title ? `«${block.title}»` : "capítulo"}`, "", "", "", formatEuros(block.cents)]}
          style={{ fontWeight: 800, padding: "6px 8px", background: "#f4f2ef" }}
        />
      );

    case "totals": {
      const q = block.quote;
      const t = quoteTotals(q);
      const rows: [string, string, boolean?][] = [];
      if (t.discount) {
        rows.push(["Suma de partidas", formatEuros(t.subtotal)]);
        rows.push([`Descuento (${formatPercent(q.descuento)})`, `−${formatEuros(t.discount)}`]);
      }
      rows.push(["Base imponible", formatEuros(t.base)]);
      rows.push([`IVA (${formatPercent(q.iva)})`, formatEuros(t.tax)]);
      return (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 280 }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ ...text, display: "flex", justifyContent: "space-between", padding: "3px 8px" }}>
                <span style={{ color: MUTED }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 6,
                padding: "8px 10px",
                background: YELLOW,
                borderRadius: 4,
                fontFamily: font.display,
                fontWeight: 700,
                color: INK,
              }}
            >
              <span style={{ fontSize: 16, letterSpacing: "0.04em" }}>TOTAL</span>
              <span style={{ fontSize: 20 }}>{formatEuros(t.total)}</span>
            </div>
          </div>
        </div>
      );
    }

    case "title":
      return <p style={{ ...text, margin: 0, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11.5 }}>{block.text}</p>;

    case "condition":
      return (
        <p style={{ ...small, margin: 0, display: "flex", gap: 8, textAlign: "justify" }}>
          <span style={{ color: MUTED }}>•</span>
          <span style={{ flex: 1 }}>{block.text}</span>
        </p>
      );

    case "signatures": {
      const { stampUrl, signatureUrl, signerCompany, signerName } = block.branding;
      const images = block.showSignature && (stampUrl || signatureUrl);
      return (
        <div style={{ ...small, display: "flex", gap: 28 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: MUTED }}>Por {company.name}:</p>
            {images ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 92, marginTop: 6 }}>
                {stampUrl && <img src={stampUrl} alt="Sello" crossOrigin="anonymous" style={{ height: 88, maxWidth: 100, objectFit: "contain" }} />}
                {signatureUrl && <img src={signatureUrl} alt="Firma" crossOrigin="anonymous" style={{ height: 80, maxWidth: 150, objectFit: "contain" }} />}
              </div>
            ) : (
              <div style={{ height: 70 }} />
            )}
            <p style={{ margin: "6px 0 0" }}>FDO: {signerCompany}</p>
            <p style={{ margin: "2px 0 0" }}>{signerName}</p>
          </div>
          <div style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 6, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontWeight: 800 }}>Conforme del cliente</p>
            <p style={{ margin: "2px 0 0", color: MUTED }}>Firma y fecha de aceptación del presupuesto</p>
            <div style={{ height: 64 }} />
            <p style={{ margin: 0, color: MUTED }}>Fdo.: ………………………………………… Fecha: ……………</p>
          </div>
        </div>
      );
    }
  }
}

/** Una hoja del presupuesto con el membrete */
export function QuotePage({ blocks, pageNumber, totalPages }: { blocks: PlacedQuoteBlock[]; pageNumber: number; totalPages: number }) {
  const l = QUOTE_LAYOUT;
  return (
    <LetterheadPage pageNumber={pageNumber} totalPages={totalPages}>
      <div style={{ position: "absolute", top: l.contentTop, left: l.padLeft, width: l.contentW, height: l.contentH, overflow: "hidden" }}>
        {blocks.map(({ block, space, repeatHead }) => (
          <div key={repeatHead ? `${block.key}-repeat` : block.key} style={{ marginTop: space }}>
            <QuoteBlockView block={block} />
          </div>
        ))}
      </div>
    </LetterheadPage>
  );
}
