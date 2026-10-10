"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { passPosition, softDotTexture } from "./textures";
import { PASSES, SKYLIGHT, useClock } from "./shared";

type PassKey = keyof typeof PASSES;

/** Qué pasada está en marcha en el instante t (y por dónde va) */
function activePass(t: number, keys: PassKey[]) {
  for (const k of keys) {
    const p = PASSES[k];
    if (t >= p.start - 0.35 && t <= p.end + 0.35) {
      const f = Math.min(1, Math.max(0, (t - p.start) / (p.end - p.start)));
      const pos = passPosition(p, f);
      // Entra y sale de escena por arriba, sin aparecer de golpe
      const lift = t < p.start ? (p.start - t) / 0.35 : t > p.end ? (t - p.end) / 0.35 : 0;
      return { key: k, ...pos, lift, working: t >= p.start && t <= p.end };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Partículas: niebla de proyección y polvo del granallado            */
/* ------------------------------------------------------------------ */

class Particles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private next = 0;
  constructor(
    private n: number,
    material: THREE.PointsMaterial,
  ) {
    this.pos = new Float32Array(n * 3).fill(-999);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(g, material);
    this.points.frustumCulled = false;
  }
  emit(o: THREE.Vector3, v: THREE.Vector3, life: number) {
    const i = this.next;
    this.next = (this.next + 1) % this.n;
    this.pos.set([o.x, o.y, o.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.life[i] = life;
  }
  step(dt: number, gravity: number, floor: number, drag = 0) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = i * 3;
      this.vel[k + 1] -= gravity * dt;
      if (drag) {
        this.vel[k] *= 1 - drag * dt;
        this.vel[k + 1] *= 1 - drag * dt;
        this.vel[k + 2] *= 1 - drag * dt;
      }
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      if (this.life[i] <= 0 || this.pos[k + 1] < floor) {
        this.life[i] = 0;
        this.pos[k + 1] = -999;
      }
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
  clear() {
    this.life.fill(0);
    this.pos.fill(-999);
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
  dispose() {
    this.points.geometry.dispose();
  }
}

const SPRAY_COLOR: Record<string, string> = { primer: "#e2ad6b", polyurea: "#9aa1a6", topcoat: "#eef0f1" };

/* ------------------------------------------------------------------ */
/*  Pistola de proyección (bicomponente, en caliente)                  */
/* ------------------------------------------------------------------ */

/** Algo mayor que la real para que se distinga a esta distancia */
const GUN_SCALE = 1.7;
const TIP = 0.22 * GUN_SCALE;
const PITCH = 1.25;

/**
 * Recorrido de una manguera: sale de la pistola, cae sobre la cubierta, va hacia el peto del
 * fondo y pasa por encima hacia la máquina de proyección (fuera de la vista).
 */
function hosePoints(rear: THREE.Vector3, dirX: number, side: number, out: THREE.Vector3[]) {
  const x = rear.x + side * 0.03;
  const wallX = 1.6 + side * 0.08 + rear.x * 0.25;
  const pts: [number, number, number][] = [
    [x, rear.y, rear.z],
    [x - dirX * 0.25, rear.y - 0.12, rear.z - 0.15],
    [x - dirX * 0.45, 0.07, rear.z - 0.55],
    [(x + wallX) / 2, 0.04, (rear.z - 2.35) / 2 - 0.1],
    [wallX, 0.04, -2.3],
    [wallX, 0.85, -2.6],
    [wallX + 0.05, 0.35, -2.95],
    [wallX + 0.1, -1.4, -3.15],
  ];
  pts.forEach((p, i) => (out[i] ??= new THREE.Vector3()).set(p[0], p[1], p[2]));
  return out;
}

function SprayGun() {
  const clock = useClock();
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Object3D>(null);
  const rear = useRef<THREE.Object3D>(null);
  const cone = useRef<THREE.Mesh>(null);
  const hoseA = useRef<THREE.Mesh>(null);
  const hoseB = useRef<THREE.Mesh>(null);

  const res = useMemo(() => {
    const dot = softDotTexture();
    const sprayMat = new THREE.PointsMaterial({
      size: 0.035,
      map: dot,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
      color: "#9aa1a6",
    });
    const spray = new Particles(clock.current.small ? 260 : 520, sprayMat);
    const coneGeo = new THREE.ConeGeometry(0.3, 0.5, 28, 1, true);
    coneGeo.translate(0, -0.25, 0);
    coneGeo.rotateX(-Math.PI / 2);
    return {
      dot,
      sprayMat,
      spray,
      coneGeo,
      coneMat: new THREE.MeshBasicMaterial({ color: "#9aa1a6", transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }),
      body: new THREE.MeshStandardMaterial({ color: "#2c2f33", metalness: 0.5, roughness: 0.4 }),
      steel: new THREE.MeshStandardMaterial({ color: "#c9ccd0", metalness: 0.9, roughness: 0.25 }),
      brass: new THREE.MeshStandardMaterial({ color: "#c19a4b", metalness: 0.85, roughness: 0.3 }),
      grip: new THREE.MeshStandardMaterial({ color: "#111214", roughness: 0.8 }),
      red: new THREE.MeshStandardMaterial({ color: "#a1271d", roughness: 0.55 }),
      blue: new THREE.MeshStandardMaterial({ color: "#1d4f93", roughness: 0.55 }),
    };
  }, [clock]);

  useEffect(
    () => () => {
      res.spray.dispose();
      res.dot.dispose();
      res.coneGeo.dispose();
      hoseA.current?.geometry.dispose();
      hoseB.current?.geometry.dispose();
      [res.sprayMat, res.coneMat, res.body, res.steel, res.brass, res.grip, res.red, res.blue].forEach((m) => m.dispose());
    },
    [res],
  );

  const tmp = useMemo(
    () => ({
      o: new THREE.Vector3(),
      d: new THREE.Vector3(),
      v: new THREE.Vector3(),
      j: new THREE.Vector3(),
      r: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      pts: [] as THREE.Vector3[],
    }),
    [],
  );
  const yaw = useRef(Math.PI / 2);
  const lastT = useRef(0);

  // Manguera: se rehace la geometría cada fotograma siguiendo a la pistola (pocos vértices)
  const updateHose = (mesh: THREE.Mesh | null, side: number, dirX: number) => {
    if (!mesh) return;
    const curve = new THREE.CatmullRomCurve3(hosePoints(tmp.r, dirX, side, tmp.pts), false, "centripetal");
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(curve, 72, 0.022, 7, false);
  };

  useFrame((_, dt) => {
    const t = clock.current.t;
    if (t < lastT.current) res.spray.clear(); // vuelta a empezar
    lastT.current = t;
    const g = outer.current;
    const a = activePass(t, ["primer", "polyurea", "topcoat"]);
    if (!g || !inner.current || !tip.current || !rear.current) return;
    g.visible = Boolean(a);
    if (hoseA.current) hoseA.current.visible = Boolean(a);
    if (hoseB.current) hoseB.current.visible = Boolean(a);
    if (a) {
      // Apunta hacia abajo, algo inclinada hacia donde avanza; el abanico cae justo en la línea de trabajo
      const targetYaw = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      yaw.current = THREE.MathUtils.damp(yaw.current, targetYaw, 10, dt);
      g.rotation.y = yaw.current;
      const height = 0.47 + TIP * Math.sin(PITCH);
      const lead = TIP * Math.cos(PITCH) + 0.47 / Math.tan(PITCH);
      g.position.set(a.x - Math.sin(yaw.current) * lead, height + a.lift * 2.5, a.z);
      inner.current.rotation.x = PITCH;
      const color = SPRAY_COLOR[a.key];
      res.sprayMat.color.set(color);
      res.coneMat.color.set(color);
      if (cone.current) cone.current.visible = a.working;
      g.updateMatrixWorld();
      rear.current.getWorldPosition(tmp.r);
      updateHose(hoseA.current, 1, a.dir);
      updateHose(hoseB.current, -1, a.dir);
      if (a.working) {
        tip.current.getWorldPosition(tmp.o);
        tip.current.getWorldQuaternion(tmp.q);
        tmp.d.set(0, 0, 1).applyQuaternion(tmp.q);
        const count = Math.round((clock.current.small ? 260 : 520) * dt * 2.2);
        for (let i = 0; i < count; i++) {
          tmp.v
            .copy(tmp.d)
            .add(tmp.j.set((Math.random() - 0.5) * 0.75, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.75))
            .normalize()
            .multiplyScalar(2.4 + Math.random() * 1.2);
          res.spray.emit(tmp.o, tmp.v, 0.4);
        }
      }
    }
    res.spray.step(dt, 1.5, 0.02, 0.6);
  });

  return (
    <>
      <primitive object={res.spray.points} />
      <mesh ref={hoseA} material={res.red} castShadow visible={false}>
        <bufferGeometry />
      </mesh>
      <mesh ref={hoseB} material={res.blue} castShadow visible={false}>
        <bufferGeometry />
      </mesh>
      <group ref={outer} visible={false}>
        <group ref={inner}>
          <group scale={GUN_SCALE}>
            {/* Cuerpo con el bloque mezclador y la boquilla delante (eje +z) */}
            <mesh material={res.body} rotation-x={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.035, 0.04, 0.24, 20]} />
            </mesh>
            <mesh material={res.steel} position={[0, 0, 0.14]} castShadow>
              <boxGeometry args={[0.075, 0.07, 0.07]} />
            </mesh>
            <mesh material={res.brass} position={[0, 0, 0.195]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.009, 0.016, 0.045, 16]} />
            </mesh>
            <mesh material={res.grip} position={[0, -0.085, -0.04]} rotation-x={-0.3} castShadow>
              <boxGeometry args={[0.035, 0.14, 0.05]} />
            </mesh>
            <mesh material={res.steel} position={[0, -0.045, 0.035]} rotation-x={0.4}>
              <boxGeometry args={[0.012, 0.06, 0.012]} />
            </mesh>
            {/* Racores de entrada de los dos componentes */}
            <mesh material={res.red} position={[0.022, -0.01, -0.13]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.014, 0.014, 0.04, 10]} />
            </mesh>
            <mesh material={res.blue} position={[-0.022, -0.01, -0.13]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.014, 0.014, 0.04, 10]} />
            </mesh>
          </group>
          <object3D ref={rear} position={[0, -0.01 * GUN_SCALE, -0.15 * GUN_SCALE]} />
          <object3D ref={tip} position={[0, 0, TIP]} />
          <mesh ref={cone} geometry={res.coneGeo} material={res.coneMat} position={[0, 0, TIP]} />
        </group>
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Granalladora para preparar el soporte (en el amarillo de la marca) */
/* ------------------------------------------------------------------ */

function ShotBlaster() {
  const clock = useClock();
  const g = useRef<THREE.Group>(null);
  const res = useMemo(() => {
    const dot = softDotTexture();
    const dustMat = new THREE.PointsMaterial({ size: 0.09, map: dot, transparent: true, depthWrite: false, opacity: 0.35, color: "#b9b1a3" });
    return {
      dot,
      dustMat,
      dust: new Particles(clock.current.small ? 160 : 320, dustMat),
      yellow: new THREE.MeshStandardMaterial({ color: "#f2c200", roughness: 0.45, metalness: 0.1 }),
      dark: new THREE.MeshStandardMaterial({ color: "#2a2b2d", roughness: 0.6, metalness: 0.3 }),
      steel: new THREE.MeshStandardMaterial({ color: "#aeb3b8", roughness: 0.3, metalness: 0.85 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#151516", roughness: 0.9 }),
      hose: new THREE.MeshStandardMaterial({ color: "#3b3d40", roughness: 0.7 }),
    };
  }, [clock]);
  useEffect(
    () => () => {
      res.dust.dispose();
      res.dot.dispose();
      [res.dustMat, res.yellow, res.dark, res.steel, res.rubber, res.hose].forEach((m) => m.dispose());
    },
    [res],
  );
  const yaw = useRef(0);
  const tmp = useMemo(() => ({ o: new THREE.Vector3(), v: new THREE.Vector3() }), []);
  const lastT = useRef(0);

  useFrame((_, dt) => {
    const t = clock.current.t;
    if (t < lastT.current) res.dust.clear();
    lastT.current = t;
    const a = activePass(t, ["prep"]);
    if (g.current) {
      g.current.visible = Boolean(a);
      if (a) {
        yaw.current = THREE.MathUtils.damp(yaw.current, a.dir > 0 ? 0 : Math.PI, 9, dt);
        g.current.rotation.y = yaw.current;
        // Rodea el lucernario (lo de alrededor se repasa a mano): se aparta de su fila al llegar
        const halfX = SKYLIGHT.w / 2 + 0.65;
        const halfZ = SKYLIGHT.d / 2 + 0.55;
        let z = a.z;
        if (Math.abs(z - SKYLIGHT.z) < halfZ) {
          const k = Math.min(1, Math.max(0, (halfX + 0.6 - Math.abs(a.x - SKYLIGHT.x)) / 0.6));
          const away = z < SKYLIGHT.z ? SKYLIGHT.z - halfZ : SKYLIGHT.z + halfZ;
          z += (away - z) * k * k * (3 - 2 * k);
        }
        g.current.position.set(a.x, a.lift * 2.5, z);
        if (a.working) {
          const back = Math.cos(yaw.current) > 0 ? -1 : 1;
          const n = Math.round((clock.current.small ? 40 : 80) * dt * 2);
          for (let i = 0; i < n; i++) {
            tmp.o.set(a.x + back * 0.5, 0.08, a.z + (Math.random() - 0.5) * 0.9);
            tmp.v.set(back * (0.2 + Math.random() * 0.5), 0.25 + Math.random() * 0.45, (Math.random() - 0.5) * 0.4);
            res.dust.emit(tmp.o, tmp.v, 1.1);
          }
        }
      }
    }
    res.dust.step(dt, -0.05, -1, 0.9);
  });

  return (
    <>
      <primitive object={res.dust.points} />
      <group ref={g} visible={false}>
        {/* Carcasa (avanza hacia +x local) */}
        <mesh material={res.yellow} position={[0, 0.27, 0]} castShadow>
          <boxGeometry args={[0.85, 0.34, 0.92]} />
        </mesh>
        <mesh material={res.dark} position={[0, 0.07, 0]} castShadow>
          <boxGeometry args={[0.9, 0.12, 0.98]} />
        </mesh>
        <mesh material={res.steel} position={[0.05, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 24]} />
        </mesh>
        {/* Ruedas y manillar */}
        {[-0.38, 0.38].map((z) => (
          <mesh key={z} material={res.rubber} position={[-0.42, 0.1, z]} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.07, 20]} />
          </mesh>
        ))}
        {[-0.22, 0.22].map((z) => (
          <mesh key={z} material={res.steel} position={[-0.68, 0.62, z]} rotation-z={0.75} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.75, 10]} />
          </mesh>
        ))}
        <mesh material={res.rubber} position={[-0.93, 0.88, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.025, 0.025, 0.55, 12]} />
        </mesh>
        {/* Manguera al aspirador de polvo */}
        <mesh material={res.hose} position={[-0.55, 0.45, 0.3]} rotation-z={1.1} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 14]} />
        </mesh>
      </group>
    </>
  );
}

export function Tools() {
  return (
    <>
      <ShotBlaster />
      <SprayGun />
    </>
  );
}
