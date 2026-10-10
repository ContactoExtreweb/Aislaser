"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ringTexture } from "./textures";
import { SKYLIGHT, leakAmount, rainAmount, useClock } from "./shared";

const FLOOR_Y = -2.8;

/** Altura a la que cae una gota en (x, z): cubierta, lucernario, albardillas o el suelo de fuera */
function groundAt(x: number, z: number) {
  const inSky = Math.abs(x - SKYLIGHT.x) < SKYLIGHT.w / 2 && Math.abs(z - SKYLIGHT.z) < SKYLIGHT.d / 2;
  if (inSky) return { y: SKYLIGHT.h + SKYLIGHT.dome * 0.8, roof: false };
  if (x >= -4 && x <= 4 && z >= -2.5 && z <= 2.5) return { y: 0.018, roof: true };
  if (x >= -4.25 && x <= 4.05 && z >= -2.75 && z <= 2.6 && (x < -3.95 || z < -2.45)) return { y: 0.75, roof: false };
  return { y: -3.05, roof: false };
}

/** Salpicaduras: anillos que se abren y se apagan */
class Splashes {
  readonly mesh: THREE.InstancedMesh;
  private life: Float32Array;
  private pos: Float32Array;
  private next = 0;
  private m = new THREE.Matrix4();
  private c = new THREE.Color();
  constructor(
    private n: number,
    material: THREE.Material,
    private duration = 0.32,
  ) {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, material, n);
    this.mesh.frustumCulled = false;
    this.life = new Float32Array(n);
    this.pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
      this.mesh.setColorAt(i, this.c.setRGB(0, 0, 0));
    }
  }
  spawn(x: number, y: number, z: number) {
    const i = this.next;
    this.next = (this.next + 1) % this.n;
    this.life[i] = this.duration;
    this.pos.set([x, y, z], i * 3);
  }
  step(dt: number, size = 0.16) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i]) / this.duration;
      const s = 0.02 + (1 - k) * size;
      this.m.makeScale(s, 1, s).setPosition(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      this.mesh.setMatrixAt(i, this.m);
      this.mesh.setColorAt(i, this.c.setScalar(k * 0.85));
      if (this.life[i] <= 0) this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  dispose() {
    this.mesh.geometry.dispose();
  }
}

/** Lluvia: gotas alargadas que caen con algo de viento y salpican al llegar a la cubierta */
function Rain() {
  const clock = useClock();
  const n = clock.current.small ? 420 : 900;
  const res = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.007, 0.26, 0.007);
    const mat = new THREE.MeshBasicMaterial({ color: "#dfe7ee", transparent: true, opacity: 0.5, depthWrite: false });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false;
    const ring = ringTexture();
    const splashMat = new THREE.MeshBasicMaterial({ map: ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const splashes = new Splashes(clock.current.small ? 70 : 140, splashMat);
    const drops = new Float32Array(n * 4); // x, y, z, velocidad
    for (let i = 0; i < n; i++) {
      drops[i * 4] = (Math.random() - 0.5) * 13;
      drops[i * 4 + 1] = -3 + Math.random() * 11;
      drops[i * 4 + 2] = (Math.random() - 0.5) * 9.5;
      drops[i * 4 + 3] = 9 + Math.random() * 4;
    }
    return { geo, mat, mesh, ring, splashMat, splashes, drops };
  }, [clock, n]);
  useEffect(
    () => () => {
      res.geo.dispose();
      res.mat.dispose();
      res.ring.dispose();
      res.splashMat.dispose();
      res.splashes.dispose();
    },
    [res],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const wind = 0.9;

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const amount = rainAmount(clock.current.t);
    res.mesh.visible = amount > 0.01;
    res.splashes.step(dt);
    if (!res.mesh.visible) return;
    res.mat.opacity = 0.5 * amount;
    const active = Math.floor(n * amount);
    const { drops } = res;
    for (let i = 0; i < n; i++) {
      const k = i * 4;
      if (i >= active) {
        dummy.scale.setScalar(0);
      } else {
        drops[k + 1] -= drops[k + 3] * dt;
        drops[k] += wind * dt;
        const g = groundAt(drops[k], drops[k + 2]);
        if (drops[k + 1] < g.y) {
          if (g.roof && Math.random() < 0.55) res.splashes.spawn(drops[k], g.y + 0.002, drops[k + 2]);
          drops[k] = (Math.random() - 0.5) * 13 - 1.5;
          drops[k + 1] = 7 + Math.random() * 3;
          drops[k + 2] = (Math.random() - 0.5) * 9.5;
        }
        dummy.scale.setScalar(1);
      }
      dummy.position.set(drops[k], drops[k + 1], drops[k + 2]);
      dummy.rotation.z = -wind / drops[k + 3];
      dummy.updateMatrix();
      res.mesh.setMatrixAt(i, dummy.matrix);
    }
    res.mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={res.mesh} />
      <primitive object={res.splashes.mesh} />
    </>
  );
}

/** Goteras en el interior: gotas que caen del techo al suelo, charcos y un cubo que se va llenando */
const LEAKS = [
  { x: -1.3, z: 0.9, every: 0.42 },
  { x: 2.1, z: 0.45, every: 0.6 },
];

function Leaks() {
  const clock = useClock();
  const res = useMemo(() => {
    const drop = new THREE.SphereGeometry(0.022, 10, 8);
    drop.scale(1, 1.6, 1);
    const water = new THREE.MeshPhysicalMaterial({ color: "#a9c4d6", roughness: 0.05, transparent: true, opacity: 0.9, clearcoat: 1 });
    const puddle = new THREE.MeshPhysicalMaterial({
      color: "#56626b",
      roughness: 0.04,
      clearcoat: 1,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const ring = ringTexture();
    const splashMat = new THREE.MeshBasicMaterial({ map: ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const splashes = new Splashes(12, splashMat, 0.4);
    const bucket = new THREE.MeshStandardMaterial({ color: "#c0392b", roughness: 0.55, side: THREE.DoubleSide });
    return { drop, water, puddle, ring, splashMat, splashes, bucket };
  }, []);
  useEffect(
    () => () => {
      res.drop.dispose();
      [res.water, res.puddle, res.splashMat, res.bucket].forEach((m) => m.dispose());
      res.ring.dispose();
      res.splashes.dispose();
    },
    [res],
  );
  const drops = useRef<(THREE.Mesh | null)[]>([]);
  const puddles = useRef<(THREE.Mesh | null)[]>([]);
  const bucketWater = useRef<THREE.Mesh>(null);
  const lastHit = useRef<number[]>(LEAKS.map(() => -1));

  useFrame((_, dt) => {
    const t = clock.current.t;
    const leak = leakAmount(t);
    res.splashes.step(Math.min(dt, 0.05), 0.12);
    LEAKS.forEach((l, i) => {
      const d = drops.current[i];
      // Cada gota tarda ~0,7 s en caer los 2,4 m del techo al suelo (caída libre)
      const dripping = t > 1.4 && t < 5.6;
      if (d) {
        const cycle = ((t - 1.4) % l.every) / l.every;
        const fall = cycle * 0.7;
        const y = -0.37 - 0.5 * 9.8 * fall * fall * (0.7 / l.every) ** 2;
        d.visible = dripping && y > FLOOR_Y + 0.25;
        d.position.set(l.x, Math.max(y, FLOOR_Y), l.z);
        const n = Math.floor((t - 1.4) / l.every);
        if (dripping && y <= FLOOR_Y + 0.3 && lastHit.current[i] !== n) {
          lastHit.current[i] = n;
          res.splashes.spawn(l.x, i === 0 ? FLOOR_Y + 0.05 + 0.18 * leak : FLOOR_Y + 0.006, l.z);
        }
      }
      const p = puddles.current[i];
      if (p) {
        const s = i === 0 ? 0 : 0.38 * leak;
        p.visible = s > 0.01;
        p.scale.set(s, 1, s * 0.8);
      }
    });
    if (bucketWater.current) {
      bucketWater.current.position.y = FLOOR_Y + 0.02 + 0.18 * leak;
      bucketWater.current.visible = leak > 0.02;
    }
  });

  return (
    <group>
      {LEAKS.map((l, i) => (
        <mesh
          key={i}
          ref={(m) => {
            drops.current[i] = m;
          }}
          geometry={res.drop}
          material={res.water}
          visible={false}
        />
      ))}
      {LEAKS.map((l, i) => (
        <mesh
          key={`p${i}`}
          ref={(m) => {
            puddles.current[i] = m;
          }}
          material={res.puddle}
          position={[l.x, FLOOR_Y + 0.004, l.z]}
          rotation-x={-Math.PI / 2}
          visible={false}
        >
          <circleGeometry args={[1, 32]} />
        </mesh>
      ))}
      {/* Cubo bajo la gotera principal */}
      <mesh material={res.bucket} position={[LEAKS[0].x, FLOOR_Y + 0.15, LEAKS[0].z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.3, 28, 1, true]} />
      </mesh>
      <mesh material={res.bucket} position={[LEAKS[0].x, FLOOR_Y + 0.005, LEAKS[0].z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.16, 28]} />
      </mesh>
      <mesh ref={bucketWater} material={res.puddle} position={[LEAKS[0].x, FLOOR_Y + 0.02, LEAKS[0].z]} rotation-x={-Math.PI / 2} visible={false}>
        <circleGeometry args={[0.18, 28]} />
      </mesh>
      <primitive object={res.splashes.mesh} />
    </group>
  );
}

export function Effects() {
  return (
    <>
      <Rain />
      <Leaks />
    </>
  );
}
