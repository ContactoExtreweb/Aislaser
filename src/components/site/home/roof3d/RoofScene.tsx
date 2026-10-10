"use client";

import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Building } from "./Building";
import { Deck } from "./Deck";
import { Effects } from "./Effects";
import { SAMPLE_LAYERS, Sample } from "./Sample";
import { Tools } from "./Tools";
import { ClockContext, LabelsContext, easeDt, rainAmount, useClock, type Clock, type SampleLabels } from "./shared";
import { TOTAL, stageIndexAt, window01 } from "./timeline";

export type RoofSceneProps = {
  /** Si la animación avanza (pausa: se queda quieta en el instante actual) */
  playingRef: RefObject<boolean>;
  /** Lo mismo como estado: en pausa sólo se dibuja cuando hace falta */
  playing: boolean;
  /** Salto pedido desde fuera (segundos); la escena lo aplica y lo vuelve a poner a null */
  seekRef: RefObject<number | null>;
  /** Cambia con cada salto, para dibujarlo aunque esté en pausa */
  seekTick: number;
  onStage: (index: number) => void;
  /** false cuando la sección no se ve: deja de dibujar para no gastar batería */
  active: boolean;
  small: boolean;
};

/** Reloj de la animación: avanza solo, se repite en bucle y avisa al cambiar de paso */
function Driver({ playingRef, seekRef, onStage }: Pick<RoofSceneProps, "playingRef" | "seekRef" | "onStage">) {
  const clock = useClock();
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const last = useRef(-1);
  useFrame((_, dt) => {
    const c = clock.current;
    c.dt = 0;
    c.playing = playingRef.current;
    c.settle = Math.max(0, c.settle - Math.min(dt, 0.1));
    if (seekRef.current != null) {
      c.t = seekRef.current;
      seekRef.current = null;
      c.settle = 3;
    } else if (playingRef.current) {
      c.dt = Math.min(dt, 0.1);
      c.t += c.dt;
      if (c.t >= TOTAL) c.t -= TOTAL;
    }
    const s = stageIndexAt(c.t);
    if (s !== last.current) {
      last.current = s;
      onStage(s);
    }
    // Fundido suave al volver a empezar
    const fade = playingRef.current ? Math.min(1, (TOTAL - c.t) / 0.45, c.t / 0.35) : 1;
    gl.domElement.style.opacity = String(Math.max(0, fade));
    // En pausa, tras un salto, sigue dibujando hasta que la cámara llega a su sitio
    if (!c.playing && c.settle > 0) invalidate();
  }, -1);
  return null;
}

/** En pausa (frameloop «demand») pide un fotograma al saltar, al reanudar o al volver a verse */
function Redraw({ tick, active, playing }: { tick: number; active: boolean; playing: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [tick, active, playing, invalidate]);
  return null;
}

const FOV = 32;
const SAMPLE_TARGET = new THREE.Vector3(4.4, 0.55, 1.1);
/** En móvil (vertical) la muestra se ve centrada en altura */
const SAMPLE_TARGET_SMALL = new THREE.Vector3(4.3, 1.05, 1.1);

/** Cámara que se mueve sola: leve vaivén, se acerca durante la proyección y encuadra la muestra al final */
function CameraRig({ small }: { small: boolean }) {
  const clock = useClock();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const st = useRef<{ az: number; el: number; dist: number; target: THREE.Vector3 } | null>(null);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const shift = small ? 0 : 0.1;

  // En pantallas anchas el rótulo del paso ocupa la izquierda: el edificio se desplaza a la derecha
  useEffect(() => {
    if (shift) camera.setViewOffset(size.width, size.height, -size.width * shift, 0, size.width, size.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, shift]);

  useFrame((_, rawDt) => {
    const dt = easeDt(clock.current, rawDt);
    const t = clock.current.t;
    const aspect = size.width / size.height;
    // Distancia para que quepa el edificio entero (≈ 9,5 m de ancho y 7,8 m de alto en pantalla) con margen
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const base = Math.max((7.8 * 1.12) / (2 * tan), (9.6 * 1.12) / (2 * tan * aspect * (1 - shift * 1.6)));
    const spray = window01(t, 12.4, 22.4, 1.4);
    const layers = window01(t, 30.9, TOTAL + 0.5, 1.1);
    let az = 0.76 + 0.08 * Math.sin(t * 0.2);
    let el = 0.46;
    let dist = base * (1 - 0.12 * spray);
    goal.set(-0.1, -1.2 + 0.5 * spray, -0.05);
    az += (0.6 - az) * layers;
    el += (0.32 - el) * layers;
    dist += (base * (small ? 0.52 : 0.55) - dist) * layers;
    goal.lerp(small ? SAMPLE_TARGET_SMALL : SAMPLE_TARGET, layers);
    if (!st.current) st.current = { az, el, dist, target: goal.clone() };
    const s = st.current;
    const k = 2.2;
    s.az = THREE.MathUtils.damp(s.az, az, k, dt);
    s.el = THREE.MathUtils.damp(s.el, el, k, dt);
    s.dist = THREE.MathUtils.damp(s.dist, dist, k, dt);
    s.target.x = THREE.MathUtils.damp(s.target.x, goal.x, k, dt);
    s.target.y = THREE.MathUtils.damp(s.target.y, goal.y, k, dt);
    s.target.z = THREE.MathUtils.damp(s.target.z, goal.z, k, dt);
    camera.position.set(
      s.target.x + s.dist * Math.cos(s.el) * Math.sin(s.az),
      s.target.y + s.dist * Math.sin(s.el),
      s.target.z + s.dist * Math.cos(s.el) * Math.cos(s.az),
    );
    camera.lookAt(s.target);
  });
  return null;
}

/** Sol de mañana mientras se trabaja y cielo cubierto cuando llueve */
function Lights({ small }: { small: boolean }) {
  const clock = useClock();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const colors = useMemo(() => ({ warm: new THREE.Color("#fff3e2"), cool: new THREE.Color("#c9d6e2") }), []);
  useFrame(() => {
    const r = rainAmount(clock.current.t);
    if (sun.current) sun.current.intensity = 2.6 - 1.7 * r;
    if (hemi.current) {
      hemi.current.intensity = 0.65 + 0.35 * r;
      hemi.current.color.lerpColors(colors.warm, colors.cool, r);
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} color="#fff3e2" groundColor="#8a8378" intensity={0.65} />
      <directionalLight
        ref={sun}
        position={[-6, 11, 5]}
        intensity={2.6}
        color="#fff1dc"
        castShadow
        shadow-mapSize={small ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={32}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      {/* Reflejos suaves (la poliurea y el agua brillan) sin descargar ningún HDR */}
      <Environment resolution={small ? 128 : 256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[14, 9, 1]} />
        <Lightformer form="rect" intensity={1.3} position={[-9, 3, 2]} rotation-y={Math.PI / 2} scale={[9, 3, 1]} color="#ffe9c8" />
        <Lightformer form="rect" intensity={1.6} position={[7, 2.5, 9]} rotation-y={-Math.PI / 4} scale={[9, 2.5, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[4, 4, -9]} scale={[8, 3, 1]} color="#dbe7f2" />
      </Environment>
    </>
  );
}

export default function RoofScene({ playingRef, playing, seekRef, seekTick, onStage, active, small }: RoofSceneProps) {
  const clock = useRef<Clock>({ t: 0, dt: 0, small, playing: true, settle: 0 });
  const labels = useRef<SampleLabels>({ layers: [], note: null });
  const [dpr, setDpr] = useState(small ? 1.5 : 1.75);
  return (
    <ClockContext.Provider value={clock}>
      <LabelsContext.Provider value={labels}>
        <Canvas
          shadows="percentage"
          dpr={[1, dpr]}
          frameloop={!active ? "never" : playing ? "always" : "demand"}
          // Plano cercano a 1 m: la cámara nunca se acerca más y así las capas, separadas sólo
          // unos milímetros, no parpadean
          camera={{ fov: FOV, near: 1, far: 80, position: [12, 9, 12] }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
          }}
          aria-hidden="true"
        >
          <PerformanceMonitor onDecline={() => setDpr(1)} />
          <Driver playingRef={playingRef} seekRef={seekRef} onStage={onStage} />
          <Redraw tick={seekTick} active={active} playing={playing} />
          <CameraRig small={small} />
          <Lights small={small} />
          <Building />
          <Deck />
          <Tools />
          <Effects />
          <Sample />
          <ContactShadows
            position={[0, -3.06, 0]}
            scale={16}
            blur={2.6}
            opacity={0.45}
            far={3.5}
            resolution={512}
            frames={1}
            color="#2a2724"
          />
        </Canvas>
        {/* Etiquetas de la muestra «capa a capa»: HTML normal, colocado desde la escena */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {SAMPLE_LAYERS.map((l, i) => (
            <div
              key={l.key}
              ref={(el) => {
                labels.current.layers[i] = el;
              }}
              className="absolute top-0 left-0 flex w-max items-center gap-2 opacity-0 will-change-transform"
            >
              <span className="h-px w-4 bg-ink-900/70 sm:w-7" />
              <span className="rounded-xl bg-white/95 px-2.5 py-1 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)] sm:px-3 sm:py-1.5">
                <span className="block font-display text-[13px] leading-tight font-bold text-ink-900 sm:text-[15px]">
                  <span className="mr-1.5 text-laser-600">{i + 1}</span>
                  {l.title}
                </span>
                <span className="hidden text-[11px] leading-snug text-ink-600 sm:block">{l.text}</span>
              </span>
            </div>
          ))}
          <div
            ref={(el) => {
              labels.current.note = el;
            }}
            className={`absolute w-max rounded-full bg-ink-950/70 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase opacity-0 ${small ? "bottom-4 left-4" : "top-0 left-0"}`}
          >
            Espesores exagerados para verlos
          </div>
        </div>
      </LabelsContext.Provider>
    </ClockContext.Provider>
  );
}
