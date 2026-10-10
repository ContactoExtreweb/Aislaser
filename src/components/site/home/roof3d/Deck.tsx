"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { phase, smooth } from "./timeline";
import { Coverage, DECK, deckTexture, makeCracks, peelTexture, rng } from "./textures";
import { DRAIN, LAYER_Y, PASSES, SKYLIGHT, UPTURNS, belowY, easeDt, leakAmount, rainAmount, useClock } from "./shared";

const WHITE = new THREE.Color("#ffffff");
const WET = new THREE.Color("#77736d");

/** Charco con el borde irregular (no un círculo perfecto) */
function puddleGeometry(seed: number) {
  const r = rng(seed);
  const shape = new THREE.Shape();
  const n = 48;
  const p1 = r() * 6;
  const p2 = r() * 6;
  const p3 = r() * 6;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 1 + 0.16 * Math.sin(a * 2 + p1) + 0.09 * Math.sin(a * 3 + p2) + 0.04 * Math.sin(a * 5 + p3);
    const x = Math.cos(a) * rad * 1.25;
    const y = Math.sin(a) * rad * 0.85;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(shape, 8);
  g.rotateX(-Math.PI / 2);
  return g;
}

const PUDDLES = [
  { x: -2.3, z: 1.25, s: 0.62, seed: 1 },
  { x: 1.5, z: 0.35, s: 0.48, seed: 2 },
  { x: 2.55, z: 1.65, s: 0.36, seed: 3 },
  { x: -0.2, z: -1.55, s: 0.44, seed: 4 },
];

/** Agua que corre hacia el sumidero cuando llueve sobre la membrana terminada */
const flowShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uAmount;
    uniform vec2 uDrain;
    varying vec2 vUv;
    void main() {
      vec2 p = vec2(vUv.x * ${DECK.w.toFixed(1)}, (1.0 - vUv.y) * ${DECK.d.toFixed(1)});
      vec2 v = p - uDrain;
      float dist = length(v);
      float ang = atan(v.y, v.x);
      // Regueros: bandas que avanzan hacia el sumidero, rotas en hilos por el ángulo
      float wave = fract(dist * 1.35 - uTime * 0.9 + 0.25 * sin(ang * 5.0 + dist * 0.7));
      float streak = smoothstep(0.8, 0.96, wave) * (1.0 - smoothstep(0.96, 1.0, wave));
      float threads = smoothstep(0.55, 1.0, 0.5 + 0.5 * sin(ang * 37.0 + sin(dist * 2.3) * 2.0));
      float near = smoothstep(0.15, 0.9, dist);
      float a = streak * threads * near * uAmount;
      gl_FragColor = vec4(0.95, 0.98, 1.0, a * 0.75);
    }
  `,
};

/** Superficie de la cubierta: hormigón viejo y sus charcos, y encima cada capa que se va aplicando */
export function Deck() {
  const clock = useClock();
  const cracks = useMemo(() => makeCracks(), []);

  const res = useMemo(() => {
    const raw = deckTexture("raw", cracks);
    const prepared = deckTexture("prepared", cracks);
    const peel = peelTexture();
    const cov = {
      prep: new Coverage(PASSES.prep, 0.66, 0),
      primer: new Coverage(PASSES.primer, 0.64, 1),
      polyurea: new Coverage(PASSES.polyurea, 0.36, 2),
      topcoat: new Coverage(PASSES.topcoat, 0.64, 1),
    };
    const mats = {
      raw: new THREE.MeshStandardMaterial({ map: raw, roughness: 0.95 }),
      prepared: new THREE.MeshStandardMaterial({ map: prepared, roughness: 0.9, alphaMap: cov.prep.texture, alphaTest: 0.5 }),
      // Imprimación: el hormigón «mojado» de resina, algo más oscuro, ambarino y brillante
      primer: new THREE.MeshPhysicalMaterial({
        map: prepared,
        color: "#9b9890",
        roughness: 0.22,
        clearcoat: 0.9,
        clearcoatRoughness: 0.12,
        alphaMap: cov.primer.texture,
        alphaTest: 0.5,
      }),
      polyurea: new THREE.MeshPhysicalMaterial({
        color: "#878d92",
        bumpMap: peel,
        bumpScale: 0.6,
        roughness: 0.38,
        clearcoat: 0.45,
        clearcoatRoughness: 0.35,
        alphaMap: cov.polyurea.texture,
        alphaTest: 0.5,
      }),
      topcoat: new THREE.MeshPhysicalMaterial({
        color: "#c6c9ca",
        bumpMap: peel,
        bumpScale: 0.45,
        roughness: 0.55,
        clearcoat: 0.2,
        clearcoatRoughness: 0.5,
        alphaMap: cov.topcoat.texture,
        alphaTest: 0.5,
      }),
      // Remates (petos y lucernario): mismos colores, sin máscara; suben con un plano de corte
      polyureaUp: new THREE.MeshPhysicalMaterial({ color: "#878d92", roughness: 0.4, clearcoat: 0.4, clippingPlanes: [belowY(0)] }),
      topcoatUp: new THREE.MeshPhysicalMaterial({ color: "#c9cdcf", roughness: 0.55, clippingPlanes: [belowY(0)] }),
      water: new THREE.MeshPhysicalMaterial({
        color: "#3f464c",
        roughness: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
      flow: new THREE.ShaderMaterial({
        ...flowShader,
        uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uDrain: { value: new THREE.Vector2(DRAIN.x + DECK.w / 2, DRAIN.z + DECK.d / 2) } },
        transparent: true,
        depthWrite: false,
      }),
    };
    return { raw, prepared, peel, cov, mats };
  }, [cracks]);

  const puddleGeos = useMemo(() => PUDDLES.map((p) => puddleGeometry(p.seed)), []);

  useEffect(
    () => () => {
      res.raw.dispose();
      res.prepared.dispose();
      res.peel.dispose();
      Object.values(res.cov).forEach((c) => c.texture.dispose());
      Object.values(res.mats).forEach((m) => m.dispose());
      puddleGeos.forEach((g) => g.dispose());
    },
    [res, puddleGeos],
  );

  const layers = useRef<Record<string, THREE.Mesh | null>>({});
  const upGroups = useRef<Record<string, THREE.Group | null>>({});
  const puddles = useRef<(THREE.Mesh | null)[]>([]);
  const flow = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const t = clock.current.t;
    const { cov, mats } = res;
    cov.prep.update(t);
    cov.primer.update(t);
    cov.polyurea.update(t);
    cov.topcoat.update(t);
    const show = (key: keyof typeof PASSES) => {
      const m = layers.current[key];
      if (m) m.visible = t >= PASSES[key].start;
    };
    show("prep");
    show("primer");
    show("polyurea");
    show("topcoat");

    // Hormigón viejo oscurecido y brillante mientras llueve y se encharca
    const leak = leakAmount(t);
    const wet = Math.max(rainAmount(t) * (t < 12 ? 1 : 0), leak) * 0.85;
    mats.raw.color.copy(WHITE).lerp(WET, wet);
    mats.raw.roughness = 0.95 - wet * 0.45;

    // Charcos: crecen con la lluvia y se retiran antes de que pase la granalladora
    const pool = t < 5.2 ? leak : Math.max(0, 1 - (t - 5.2) / 0.8);
    puddles.current.forEach((m, i) => {
      if (!m) return;
      const s = PUDDLES[i].s * smooth(Math.min(1, pool * (1.1 - i * 0.08)));
      m.visible = s > 0.01;
      m.scale.setScalar(Math.max(s, 0.0001));
    });

    // La poliurea recién proyectada brilla y en segundos queda satinada
    const fresh = t >= PASSES.polyurea.start && t < PASSES.polyurea.end + 1.2 ? 1 : 0;
    mats.polyurea.roughness = THREE.MathUtils.damp(mats.polyurea.roughness, fresh ? 0.26 : 0.4, 3, easeDt(clock.current, dt));
    // Con lluvia, el acabado se ve mojado
    const rainOnTop = t > 24 ? rainAmount(t) : 0;
    mats.topcoat.roughness = 0.55 - rainOnTop * 0.4;
    mats.topcoat.clearcoat = 0.2 + rainOnTop * 0.8;

    // Remates que suben por petos y lucernario
    const up = (key: "polyurea" | "topcoat", mat: THREE.Material) => {
      const u = UPTURNS[key];
      const h = smooth(phase(t, u.start, u.end)) * u.height;
      belowY(h, mat.clippingPlanes![0]);
      const g = upGroups.current[key];
      if (g) g.visible = h > 0.001;
    };
    up("polyurea", mats.polyureaUp);
    up("topcoat", mats.topcoatUp);

    // Agua corriendo hacia el sumidero sobre la membrana terminada
    const amount = t > 24 ? rainAmount(t) : 0;
    mats.flow.uniforms.uAmount.value = amount;
    mats.flow.uniforms.uTime.value = t;
    if (flow.current) flow.current.visible = amount > 0.01;
  });

  const plane = (key: string, y: number, material: THREE.Material) => (
    <mesh
      key={key}
      ref={(m) => {
        layers.current[key] = m;
      }}
      material={material}
      position={[0, y, 0]}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      <planeGeometry args={[DECK.w, DECK.d]} />
    </mesh>
  );

  // Remates: caras interiores de los petos y laterales del zócalo del lucernario
  const upturn = (key: "polyurea" | "topcoat", material: THREE.Material, out: number) => {
    const h = 0.3;
    const sx = SKYLIGHT.w / 2 + out;
    const sz = SKYLIGHT.d / 2 + out;
    return (
      <group
        key={`up-${key}`}
        ref={(g) => {
          upGroups.current[key] = g;
        }}
        visible={false}
      >
        <mesh material={material} position={[0, h / 2, -DECK.d / 2 + out]} receiveShadow>
          <planeGeometry args={[DECK.w, h]} />
        </mesh>
        <mesh material={material} position={[-DECK.w / 2 + out, h / 2, 0]} rotation-y={Math.PI / 2} receiveShadow>
          <planeGeometry args={[DECK.d, h]} />
        </mesh>
        <mesh material={material} position={[SKYLIGHT.x, SKYLIGHT.h / 2, SKYLIGHT.z + sz]}>
          <planeGeometry args={[SKYLIGHT.w + out * 2, SKYLIGHT.h]} />
        </mesh>
        <mesh material={material} position={[SKYLIGHT.x, SKYLIGHT.h / 2, SKYLIGHT.z - sz]} rotation-y={Math.PI}>
          <planeGeometry args={[SKYLIGHT.w + out * 2, SKYLIGHT.h]} />
        </mesh>
        <mesh material={material} position={[SKYLIGHT.x + sx, SKYLIGHT.h / 2, SKYLIGHT.z]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[SKYLIGHT.d + out * 2, SKYLIGHT.h]} />
        </mesh>
        <mesh material={material} position={[SKYLIGHT.x - sx, SKYLIGHT.h / 2, SKYLIGHT.z]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[SKYLIGHT.d + out * 2, SKYLIGHT.h]} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {plane("raw", LAYER_Y.raw, res.mats.raw)}
      {plane("prep", LAYER_Y.prepared, res.mats.prepared)}
      {plane("primer", LAYER_Y.primer, res.mats.primer)}
      {plane("polyurea", LAYER_Y.polyurea, res.mats.polyurea)}
      {plane("topcoat", LAYER_Y.topcoat, res.mats.topcoat)}
      {upturn("polyurea", res.mats.polyureaUp, 0.004)}
      {upturn("topcoat", res.mats.topcoatUp, 0.007)}
      {PUDDLES.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            puddles.current[i] = m;
          }}
          geometry={puddleGeos[i]}
          material={res.mats.water}
          position={[p.x, LAYER_Y.water, p.z]}
          visible={false}
        />
      ))}
      <mesh ref={flow} material={res.mats.flow} position={[0, LAYER_Y.water, 0]} rotation-x={-Math.PI / 2} visible={false}>
        <planeGeometry args={[DECK.w, DECK.d]} />
      </mesh>
    </group>
  );
}
