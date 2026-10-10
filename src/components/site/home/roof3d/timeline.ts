// Guion de la animación de la cubierta: cada paso con su intervalo (segundos) y sus textos.
// Todo lo que se ve en la escena se calcula a partir del tiempo, así que se puede saltar a
// cualquier paso y la animación se repite sola en bucle.

export type Stage = {
  key: string;
  title: string;
  short: string;
  text: string;
  start: number;
  end: number;
  /** Escena con lluvia (cielo de tormenta) */
  rain?: boolean;
};

export const STAGES: Stage[] = [
  {
    key: "filtraciones",
    title: "Una cubierta con filtraciones",
    short: "Filtraciones",
    text: "Las fisuras del hormigón dejan pasar el agua: aparecen charcos, goteras y humedades en el interior.",
    start: 0,
    end: 5.5,
    rain: true,
  },
  {
    key: "preparacion",
    title: "Preparación del soporte",
    short: "Preparación",
    text: "Limpiamos y granallamos el hormigón y sellamos las fisuras. Sin un buen soporte no hay buena impermeabilización.",
    start: 5.5,
    end: 9.5,
  },
  {
    key: "imprimacion",
    title: "Imprimación",
    short: "Imprimación",
    text: "Una imprimación específica para el soporte asegura la máxima adherencia de la membrana.",
    start: 9.5,
    end: 12.5,
  },
  {
    key: "poliurea",
    title: "Poliurea proyectada en caliente",
    short: "Poliurea",
    text: "Proyectamos la poliurea en caliente: forma una membrana continua, sin juntas ni solapes, que cura en segundos y sube por petos y lucernarios.",
    start: 12.5,
    end: 22,
  },
  {
    key: "acabado",
    title: "Acabado de protección UV",
    short: "Acabado UV",
    text: "Un acabado alifático protege la membrana del sol y le da el color definitivo.",
    start: 22,
    end: 24.5,
  },
  {
    key: "estanqueidad",
    title: "Estanqueidad total",
    short: "Estanqueidad",
    text: "Vuelve a llover: el agua corre hacia el sumidero sin encontrar ni una junta por la que entrar. El interior, seco.",
    start: 24.5,
    end: 31,
    rain: true,
  },
  {
    key: "capas",
    title: "El sistema, capa a capa",
    short: "Capa a capa",
    text: "Soporte preparado, imprimación, membrana de poliurea y acabado: un sistema completo que no necesita mantenimiento.",
    start: 31,
    end: 37,
  },
];

export const TOTAL = STAGES[STAGES.length - 1].end;

export const stageIndexAt = (t: number) => {
  const i = STAGES.findIndex((s) => t >= s.start && t < s.end);
  return i < 0 ? STAGES.length - 1 : i;
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 → 1 entre a y b (lineal) */
export const phase = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
/** Suavizado (ease in-out) */
export const smooth = (x: number) => x * x * (3 - 2 * x);
/** 0 → 1 → 0: sube en [a, a+fade], se mantiene y baja en [b-fade, b] */
export const window01 = (t: number, a: number, b: number, fade = 0.6) => smooth(phase(t, a, a + fade)) * (1 - smooth(phase(t, b - fade, b)));
