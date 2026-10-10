"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { deckTexture, makeCracks, sectionTexture } from "./textures";
import { phase, smooth, window01 } from "./timeline";
import { LabelsContext, useClock, worldUvBox } from "./shared";

/** Muestra de la esquina delantera derecha de la cubierta, de abajo arriba (espesores exagerados) */
export const SAMPLE_LAYERS = [
  { key: "soporte", h: 0.3, title: "Soporte preparado", text: "Hormigón granallado y con las fisuras selladas" },
  { key: "imprimacion", h: 0.025, title: "Imprimación", text: "Máxima adherencia de la membrana" },
  { key: "poliurea", h: 0.09, title: "Membrana de poliurea", text: "Continua, sin juntas · unos 2 mm · cura en segundos" },
  { key: "acabado", h: 0.03, title: "Acabado alifático", text: "Protege del sol (UV) y da el color final" },
] as const;

const SIZE = 1.4;
/** Metros por repetición de la textura del canto (misma escala que el forjado) */
const M = 0.35 / 0.86;
const CENTER = { x: 4 - SIZE / 2, z: 2.5 - SIZE / 2 };
const T = { rise: [31, 32], open: [32.1, 33.1], close: [35.9, 36.6], end: 36.95 } as const;

export function Sample() {
  const clock = useClock();
  const group = useRef<THREE.Group>(null);
  const pieces = useRef<(THREE.Group | null)[]>([]);
  const labels = useContext(LabelsContext);
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  const v = useMemo(() => new THREE.Vector3(), []);

  /** Coloca una etiqueta HTML en el punto 3D (local de la pieza) proyectado en pantalla */
  const place = (el: HTMLDivElement | null, obj: THREE.Object3D | null, local: [number, number, number], opacity: number) => {
    if (!el) return;
    el.style.opacity = String(opacity);
    if (!obj || opacity <= 0) return;
    obj.localToWorld(v.set(...local)).project(camera);
    const x = ((v.x + 1) / 2) * size.width;
    const y = ((1 - v.y) / 2) * size.height;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${(1 - opacity) * -10}px, -50%)`;
  };

  const res = useMemo(() => {
    const section = sectionTexture();
    const top = deckTexture("prepared", makeCracks());
    // Parte de la cubierta preparada que corresponde a esta esquina (las UV de la caja van en
    // unidades de M metros, por eso se compensa la repetición)
    top.repeat.set(M / 8, M / 5);
    top.offset.set((8 - SIZE) / 8, 0);
    const concreteSide = new THREE.MeshStandardMaterial({ map: section, roughness: 0.92 });
    const concreteTop = new THREE.MeshStandardMaterial({ map: top, roughness: 0.9 });
    return {
      section,
      top,
      geo: worldUvBox(SIZE, SAMPLE_LAYERS[0].h, SIZE, M),
      mats: [
        [concreteSide, concreteSide, concreteTop, concreteSide, concreteSide, concreteSide],
        new THREE.MeshPhysicalMaterial({ color: "#a8916c", roughness: 0.25, clearcoat: 0.9 }),
        new THREE.MeshPhysicalMaterial({ color: "#878d92", roughness: 0.4, clearcoat: 0.4 }),
        new THREE.MeshPhysicalMaterial({ color: "#c9cdcf", roughness: 0.55, clearcoat: 0.2 }),
      ] as (THREE.Material | THREE.Material[])[],
    };
  }, []);
  useEffect(
    () => () => {
      res.section.dispose();
      res.top.dispose();
      res.geo.dispose();
      res.mats.flat().forEach((m) => m.dispose());
    },
    [res],
  );

  useFrame(() => {
    const t = clock.current.t;
    const g = group.current;
    if (!g) return;
    g.visible = t >= T.rise[0] && t < T.end;
    if (!g.visible) {
      labels?.current.layers.forEach((el) => el && (el.style.opacity = "0"));
      if (labels?.current.note) labels.current.note.style.opacity = "0";
      return;
    }
    const up = smooth(phase(t, T.rise[0], T.rise[1])) * (1 - smooth(phase(t, T.close[0] + 0.2, T.close[1])));
    const open = smooth(phase(t, T.open[0], T.open[1])) * (1 - smooth(phase(t, T.close[0], T.close[1] - 0.2)));
    g.position.set(CENTER.x, up * 1.25, CENTER.z);
    g.rotation.y = -0.25 * smooth(phase(t, T.rise[0], T.close[0]));
    let y = -SAMPLE_LAYERS[0].h;
    SAMPLE_LAYERS.forEach((l, i) => {
      const p = pieces.current[i];
      if (p) p.position.y = y + l.h / 2 + i * open * 0.3;
      y += l.h;
    });
    // Etiquetas a la derecha de cada capa (esquina trasera derecha: la más a la derecha en pantalla)
    const show = window01(t, T.open[1] - 0.2, T.close[0] + 0.1, 0.4);
    g.updateMatrixWorld();
    if (labels) {
      SAMPLE_LAYERS.forEach((_, i) => place(labels.current.layers[i], pieces.current[i], [SIZE / 2 + 0.04, 0, -SIZE / 2 + 0.1], show));
      // En móvil el aviso va fijo abajo a la izquierda (proyectado tapaba las etiquetas)
      if (clock.current.small) {
        if (labels.current.note) labels.current.note.style.opacity = String(show * 0.9);
      } else place(labels.current.note, pieces.current[0], [-SIZE / 2, -0.32, SIZE / 2], show * 0.9);
    }
  });

  let base = -SAMPLE_LAYERS[0].h;
  return (
    <group ref={group} visible={false}>
      {SAMPLE_LAYERS.map((l, i) => {
        const yCenter = base + l.h / 2;
        base += l.h;
        return (
          <group
            key={l.key}
            ref={(g) => {
              pieces.current[i] = g;
            }}
            position={[0, yCenter, 0]}
          >
            {i === 0 ? (
              <mesh geometry={res.geo} material={res.mats[0]} castShadow receiveShadow />
            ) : (
              <mesh material={res.mats[i]} castShadow receiveShadow>
                <boxGeometry args={[SIZE, l.h, SIZE]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
