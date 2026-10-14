export type QuoteStatus = "borrador" | "enviado" | "aceptado" | "rechazado";
export type LineKind = "partida" | "capitulo";

export const QUOTE_STATUSES: { value: QuoteStatus; label: string; tone: string }[] = [
  { value: "borrador", label: "Borrador", tone: "bg-white text-ink-700 ring-1 ring-ink-200" },
  { value: "enviado", label: "Enviado", tone: "bg-sky-100 text-sky-800" },
  { value: "aceptado", label: "Aceptado", tone: "bg-emerald-500 text-white" },
  { value: "rechazado", label: "Rechazado", tone: "bg-red-100 text-red-700" },
];

export const statusInfo = (s: QuoteStatus) => QUOTE_STATUSES.find((x) => x.value === s) ?? QUOTE_STATUSES[0];

export type QuoteLine = {
  id: string;
  presupuesto_id: string;
  orden: number;
  tipo: LineKind;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio: number;
};

export type Quote = {
  id: string;
  anio: number;
  numero: number;
  estado: QuoteStatus;
  fecha: string;
  validez_dias: number;
  cliente_nombre: string;
  cliente_nif: string;
  cliente_direccion: string;
  cliente_email: string;
  cliente_telefono: string;
  atencion: string;
  obra: string;
  ubicacion: string;
  introduccion: string;
  condiciones: string;
  notas_internas: string;
  iva: number;
  descuento: number;
  mostrar_firma: boolean;
  mensaje_id: string | null;
  created_at: string;
  updated_at: string;
  lineas: QuoteLine[];
};

/** Campos que se editan a mano (el número, el año y las fechas internas los pone la base de datos) */
export type QuoteFields = Omit<Quote, "id" | "anio" | "numero" | "mensaje_id" | "created_at" | "updated_at" | "lineas">;
export type LineFields = Pick<QuoteLine, "tipo" | "descripcion" | "unidad" | "cantidad" | "precio">;

/** Columnas de la tabla presupuestos que se leen en el panel */
export const QUOTE_COLUMNS =
  "id, anio, numero, estado, fecha, validez_dias, cliente_nombre, cliente_nif, cliente_direccion, cliente_email, cliente_telefono, atencion, obra, ubicacion, introduccion, condiciones, notas_internas, iva, descuento, mostrar_firma, mensaje_id, created_at, updated_at";
export const LINE_COLUMNS = "id, presupuesto_id, orden, tipo, descripcion, unidad, cantidad, precio";

/** Postgres devuelve los numeric como texto: se convierten aquí */
export function hydrateQuote(row: Record<string, unknown>, lines: Record<string, unknown>[]): Quote {
  return {
    ...(row as Omit<Quote, "lineas" | "iva" | "descuento">),
    iva: Number(row.iva ?? 21),
    descuento: Number(row.descuento ?? 0),
    lineas: lines
      .map((l) => ({ ...(l as QuoteLine), cantidad: Number(l.cantidad ?? 0), precio: Number(l.precio ?? 0) }))
      .sort((a, b) => a.orden - b.orden),
  };
}

/* ------------------------------------------------------------------ */
/*  Importes (en céntimos para no arrastrar errores de redondeo)       */
/* ------------------------------------------------------------------ */

const cents = (euros: number) => Math.round((euros + Number.EPSILON) * 100);

/** Importe de una partida: cantidad × precio, redondeado al céntimo */
export const lineCents = (l: Pick<QuoteLine, "tipo" | "cantidad" | "precio">) =>
  l.tipo === "capitulo" ? 0 : Math.round(Math.round(l.cantidad * 1000) * cents(l.precio) / 1000);

export type Totals = {
  /** Suma de las partidas */
  subtotal: number;
  /** Descuento global aplicado sobre la suma */
  discount: number;
  /** Base imponible (suma − descuento) */
  base: number;
  tax: number;
  total: number;
  /** Total de cada capítulo, por id del capítulo */
  chapters: Record<string, number>;
};

/** Todos los importes en céntimos */
export function quoteTotals(q: Pick<Quote, "lineas" | "iva" | "descuento">): Totals {
  const chapters: Record<string, number> = {};
  let current: string | null = null;
  let subtotal = 0;
  for (const l of q.lineas) {
    if (l.tipo === "capitulo") {
      current = l.id;
      chapters[current] = 0;
      continue;
    }
    const c = lineCents(l);
    subtotal += c;
    if (current) chapters[current] += c;
  }
  const discount = Math.round((subtotal * q.descuento) / 100);
  const base = subtotal - discount;
  const tax = Math.round((base * q.iva) / 100);
  return { subtotal, discount, base, tax, total: base + tax, chapters };
}

// Con separador de miles también en cifras de cuatro dígitos (5.931,94 €), como en cualquier presupuesto
const euroFormat = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, useGrouping: "always" });
const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 });
const percentFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

/** 123456 céntimos → «1.234,56 €» */
export const formatEuros = (centsValue: number) => euroFormat.format(centsValue / 100);
export const formatQuantity = (n: number) => numberFormat.format(n);
export const formatPercent = (n: number) => `${percentFormat.format(n)} %`;

/** «2026-007» */
export const quoteNumber = (q: Pick<Quote, "anio" | "numero">) => `${q.anio}-${String(q.numero).padStart(3, "0")}`;

/** Fecha (AAAA-MM-DD) más n días, sin depender de la zona horaria del navegador */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Texto escrito por el usuario → número. La coma es el decimal y el punto, el separador de miles
 * («1.500» son mil quinientos). Sin coma, un punto que no separa grupos de tres cifras se toma
 * como decimal («24.90»), por si se escribe al estilo inglés.
 */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(/\s/g, "");
  if (!t) return 0;
  const thousands = /^-?\d{1,3}(\.\d{3})+$/.test(t);
  const normalized = t.includes(",") || thousands ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/*  Unidades y partidas frecuentes                                     */
/* ------------------------------------------------------------------ */

export const UNITS = ["m²", "ml", "m³", "ud", "h", "kg", "l", "PA"] as const;

/** Partidas habituales de Aislaser para añadir con un clic (el precio se pone en cada presupuesto) */
export const CATALOG: { group: string; items: Omit<LineFields, "tipo" | "precio">[] }[] = [
  {
    group: "Preparación",
    items: [
      { descripcion: "Limpieza a fondo del soporte y retirada de restos sueltos.", unidad: "m²", cantidad: 1 },
      { descripcion: "Granallado o fresado mecánico del soporte de hormigón para abrir el poro y eliminar lechadas.", unidad: "m²", cantidad: 1 },
      { descripcion: "Sellado de fisuras y reparación de coqueras con mortero o masilla de poliuretano.", unidad: "ml", cantidad: 1 },
      { descripcion: "Chorreado de arena para limpieza y preparación de superficies.", unidad: "m²", cantidad: 1 },
    ],
  },
  {
    group: "Impermeabilización con poliurea",
    items: [
      { descripcion: "Imprimación específica para el soporte, aplicada a rodillo o pistola, para asegurar la adherencia de la membrana.", unidad: "m²", cantidad: 1 },
      {
        descripcion:
          "Impermeabilización con membrana de poliurea pura proyectada en caliente con equipo bicomponente de alta presión, espesor medio de 2 mm. Membrana continua, sin juntas ni solapes.",
        unidad: "m²",
        cantidad: 1,
      },
      { descripcion: "Remate de petos, encuentros y lucernarios con la misma membrana de poliurea.", unidad: "ml", cantidad: 1 },
      { descripcion: "Acabado de protección con poliuretano alifático resistente a los rayos UV, en el color elegido.", unidad: "m²", cantidad: 1 },
      { descripcion: "Tratamiento de sumideros y desagües con refuerzo de poliurea.", unidad: "ud", cantidad: 1 },
    ],
  },
  {
    group: "Poliuretano y aislamiento",
    items: [
      { descripcion: "Aislamiento térmico con espuma de poliuretano proyectado, densidad 35 kg/m³ y espesor medio de 4 cm.", unidad: "m²", cantidad: 1 },
      { descripcion: "Impermeabilización y aislamiento con poliuretano proyectado de alta densidad sobre cubierta.", unidad: "m²", cantidad: 1 },
      { descripcion: "Aislamiento por insuflado de la cámara de aire de fachada, incluidos los taladros y su sellado posterior.", unidad: "m²", cantidad: 1 },
    ],
  },
  {
    group: "Otros",
    items: [
      { descripcion: "Taladro en hormigón con corona de diamante.", unidad: "ud", cantidad: 1 },
      { descripcion: "Corte de hormigón con disco diamantado.", unidad: "ml", cantidad: 1 },
      { descripcion: "Medios auxiliares, protecciones y elementos de seguridad necesarios para la ejecución.", unidad: "PA", cantidad: 1 },
      { descripcion: "Retirada de residuos y limpieza final de la obra.", unidad: "PA", cantidad: 1 },
      { descripcion: "Desplazamiento del equipo y la maquinaria a la obra.", unidad: "PA", cantidad: 1 },
    ],
  },
];
