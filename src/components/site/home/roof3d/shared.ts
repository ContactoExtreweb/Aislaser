import { createContext, useContext } from "react";
import * as THREE from "three";

/** Reloj de la animación (segundos dentro del bucle). Lo actualiza la escena y lo leen todas las piezas */
export type Clock = { t: number; small: boolean };
export const ClockContext = createContext<{ current: Clock } | null>(null);
export const useClock = () => useContext(ClockContext)!;

/** Etiquetas HTML de la muestra «capa a capa» (encima del canvas); la escena las coloca cada fotograma */
export type SampleLabels = { layers: (HTMLDivElement | null)[]; note: HTMLDivElement | null };
export const LabelsContext = createContext<{ current: SampleLabels } | null>(null);

/** Alturas de las capas sobre el forjado (m): planos casi coincidentes, separados para que no parpadeen */
export const LAYER_Y = { raw: 0.001, prepared: 0.003, primer: 0.005, polyurea: 0.008, topcoat: 0.011, water: 0.016 } as const;

/** Sumidero y lucernario (para la lluvia, el agua que corre y los remates) */
export const DRAIN = { x: 3.0, z: -1.75 } as const;
export const SKYLIGHT = { x: -1.6, z: -0.6, w: 1.3, d: 1.0, h: 0.22, dome: 0.26 } as const;

/** Caja con las coordenadas de textura en metros: la textura (1 × 1 m) no se estira con el tamaño */
export function worldUvBox(w: number, h: number, d: number, meters = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // Orden de caras de BoxGeometry: +x, −x, +y, −y, +z, −z (4 vértices cada una)
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / meters, (uv.getY(i) * dims[f][1]) / meters);
    }
  }
  uv.needsUpdate = true;
  return g;
}

/** Plano de clipping que deja ver sólo lo que está por debajo de y (para remates que «suben») */
export const belowY = (y: number, plane = new THREE.Plane()) => plane.set(new THREE.Vector3(0, -1, 0), y);

/**
 * Pasadas de cada capa (zigzag por filas, con el tiempo de inicio y fin en segundos).
 * Las herramientas y las máscaras de cobertura usan las mismas, así que siempre coinciden.
 */
export const PASSES = {
  prep: { rows: 5, width: 1.0, start: 5.8, end: 9.2 },
  primer: { rows: 5, width: 1.0, start: 9.75, end: 12.25 },
  polyurea: { rows: 9, width: 0.55, start: 12.8, end: 20.5 },
  topcoat: { rows: 5, width: 1.0, start: 22.2, end: 23.9 },
} as const;

/** Remates: la membrana sube por petos y lucernario al final de su capa */
export const UPTURNS = {
  polyurea: { start: 20.6, end: 21.5, height: 0.3 },
  topcoat: { start: 23.95, end: 24.4, height: 0.3 },
} as const;

/** Cuánto llueve (0–1) en cada momento */
export function rainAmount(t: number) {
  const a = Math.min(1, Math.max(0, (t - 0) / 0.8)) * (1 - Math.min(1, Math.max(0, (t - 4.9) / 0.8)));
  const b = Math.min(1, Math.max(0, (t - 24.7) / 0.9)) * (1 - Math.min(1, Math.max(0, (t - 30.2) / 0.8)));
  return Math.max(a, b);
}

/** Agua acumulada por las filtraciones (charcos, goteras, cubo): sube con la lluvia y se seca al preparar */
export function leakAmount(t: number) {
  if (t < 0.6) return 0;
  if (t < 5.5) return Math.min(1, (t - 0.6) / 4.2);
  if (t < 8) return 1 - (t - 5.5) / 2.5;
  return 0;
}
