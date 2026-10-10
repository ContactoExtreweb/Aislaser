"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { grateTexture, plasterTexture, sectionTexture } from "./textures";
import { DRAIN, SKYLIGHT, worldUvBox } from "./shared";

/**
 * El edificio en corte: forjado de hormigón con su canto a la vista (áridos y armaduras), petos con
 * albardilla, muros con el interior enlucido, solera, sumidero con su bajante y un lucernario.
 * Lo que cambia con el tiempo (capas, agua, herramientas) está en otros componentes.
 */
export function Building() {
  const mats = useMemo(() => {
    const section = sectionTexture();
    const sectionPlain = sectionTexture({ rebar: false, tone: "#a39e95" });
    const plaster = plasterTexture();
    plaster.repeat.set(1, 1);
    const grate = grateTexture();
    return {
      section: new THREE.MeshStandardMaterial({ map: section, roughness: 0.92, color: "#ffffff" }),
      sectionPlain: new THREE.MeshStandardMaterial({ map: sectionPlain, roughness: 0.92 }),
      plaster: new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95 }),
      render: new THREE.MeshStandardMaterial({ color: "#d9d4cb", roughness: 0.9 }),
      coping: new THREE.MeshStandardMaterial({ color: "#b7b1a7", roughness: 0.7 }),
      floor: new THREE.MeshStandardMaterial({ color: "#cfc9bf", roughness: 0.55 }),
      metal: new THREE.MeshStandardMaterial({ color: "#3a3b3d", roughness: 0.45, metalness: 0.6 }),
      grate: new THREE.MeshStandardMaterial({ map: grate, roughness: 0.5, metalness: 0.5, transparent: true }),
      pipe: new THREE.MeshStandardMaterial({ color: "#8b8f93", roughness: 0.4 }),
      dome: new THREE.MeshPhysicalMaterial({
        color: "#dfe9f0",
        roughness: 0.12,
        transparent: true,
        opacity: 0.55,
        clearcoat: 1,
        side: THREE.DoubleSide,
      }),
      curb: new THREE.MeshStandardMaterial({ color: "#b9b4ab", roughness: 0.85 }),
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      });
    },
    [mats],
  );

  const geo = useMemo(() => {
    const domeGeo = new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    return {
      slab: worldUvBox(8, 0.35, 5, 0.35 / 0.86),
      backWall: worldUvBox(8.2, 2.45, 0.2),
      leftWall: worldUvBox(0.2, 2.45, 5),
      floor: worldUvBox(8.2, 0.25, 5.2),
      backParapet: worldUvBox(8.2, 0.7, 0.2),
      leftParapet: worldUvBox(0.2, 0.7, 5),
      dome: domeGeo,
    };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  // Caras de cada caja: +x, −x, +y, −y, +z, −z
  const wallBack = [mats.section, mats.render, mats.render, mats.render, mats.plaster, mats.render];
  const wallLeft = [mats.plaster, mats.render, mats.render, mats.render, mats.section, mats.render];
  const floor = [mats.sectionPlain, mats.sectionPlain, mats.floor, mats.sectionPlain, mats.sectionPlain, mats.sectionPlain];
  const parapetBack = [mats.section, mats.render, mats.render, mats.render, mats.render, mats.render];
  const parapetLeft = [mats.render, mats.render, mats.render, mats.render, mats.section, mats.render];

  return (
    <group>
      {/* Forjado (el canto delantero y el derecho son el corte) */}
      <mesh geometry={geo.slab} material={mats.section} position={[0, -0.175, 0]} castShadow receiveShadow />
      {/* Petos con albardilla */}
      <mesh geometry={geo.backParapet} material={parapetBack} position={[-0.1, 0.35, -2.6]} castShadow receiveShadow />
      <mesh geometry={geo.leftParapet} material={parapetLeft} position={[-4.1, 0.35, 0]} castShadow receiveShadow />
      <mesh material={mats.coping} position={[-0.1, 0.72, -2.6]} castShadow>
        <boxGeometry args={[8.3, 0.05, 0.3]} />
      </mesh>
      <mesh material={mats.coping} position={[-4.1, 0.72, 0.05]} castShadow>
        <boxGeometry args={[0.3, 0.05, 5.1]} />
      </mesh>
      {/* Muros y solera: el interior queda a la vista por el corte */}
      <mesh geometry={geo.backWall} material={wallBack} position={[-0.1, -1.575, -2.6]} receiveShadow castShadow />
      <mesh geometry={geo.leftWall} material={wallLeft} position={[-4.1, -1.575, 0]} receiveShadow castShadow />
      <mesh geometry={geo.floor} material={floor} position={[-0.1, -2.925, -0.1]} receiveShadow />
      {/* Sumidero: aro, rejilla y bajante por el interior */}
      <mesh material={mats.metal} position={[DRAIN.x, 0.03, DRAIN.z]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.19, 0.035, 12, 40]} />
      </mesh>
      <mesh material={mats.grate} position={[DRAIN.x, 0.05, DRAIN.z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.17, 40]} />
      </mesh>
      <mesh material={mats.pipe} position={[DRAIN.x, -1.6, DRAIN.z]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 2.5, 20]} />
      </mesh>
      {/* Lucernario: zócalo de obra y cúpula */}
      <mesh material={mats.curb} position={[SKYLIGHT.x, SKYLIGHT.h / 2, SKYLIGHT.z]} castShadow receiveShadow>
        <boxGeometry args={[SKYLIGHT.w, SKYLIGHT.h, SKYLIGHT.d]} />
      </mesh>
      <mesh
        geometry={geo.dome}
        material={mats.dome}
        position={[SKYLIGHT.x, SKYLIGHT.h, SKYLIGHT.z]}
        scale={[SKYLIGHT.w / 2 - 0.08, SKYLIGHT.dome, SKYLIGHT.d / 2 - 0.08]}
        castShadow
      />
    </group>
  );
}
