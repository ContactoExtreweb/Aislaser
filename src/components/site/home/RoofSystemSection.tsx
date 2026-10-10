"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, ShieldCheck, Timer, Waves } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { STAGES } from "./roof3d/timeline";

// Three.js sólo se descarga cuando la sección está a punto de verse
const RoofScene = dynamic(() => import("./roof3d/RoofScene"), { ssr: false });

const FACTS = [
  { icon: Waves, text: "Membrana continua, sin juntas ni solapes" },
  { icon: Timer, text: "Cura en segundos" },
  { icon: ShieldCheck, text: "Sin mantenimiento" },
];

/** Instante que se enseña quieto si el visitante prefiere menos movimiento: la muestra capa a capa */
const STILL_TIME = 34;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Animación 3D de cómo se impermeabiliza una cubierta con poliurea, de la filtración a la
 * estanqueidad. Avanza sola (no depende del scroll), se para fuera de pantalla y se puede
 * pausar o saltar a cualquier paso.
 */
export function RoofSystemSection() {
  const card = useRef<HTMLDivElement>(null);
  const playingRef = useRef(true);
  const seekRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [stage, setStage] = useState(0);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState<"pending" | "ok" | "no-webgl">("pending");
  const [small, setSmall] = useState(false);

  useEffect(() => {
    setSmall(window.innerWidth < 768);
    setReady(webglAvailable() ? "ok" : "no-webgl");
    // Con «reducir movimiento» se enseña quieta (la muestra capa a capa); se puede reproducir con el botón
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      playingRef.current = false;
      setPlaying(false);
      seekRef.current = STILL_TIME;
    }
    if (process.env.NODE_ENV !== "production") {
      // Sólo en desarrollo: para revisar cualquier instante desde la consola o las pruebas
      (window as unknown as { __roof?: unknown }).__roof = {
        seek: (t: number) => (seekRef.current = t),
        play: () => ((playingRef.current = true), setPlaying(true)),
        pause: () => ((playingRef.current = false), setPlaying(false)),
      };
    }
    const el = card.current;
    if (!el) return;
    let onScreen = false;
    const loader = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    const viewer = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        setVisible(onScreen && !document.hidden);
      },
      { threshold: 0.05 },
    );
    loader.observe(el);
    viewer.observe(el);
    // Pestaña en segundo plano: no se dibuja
    const onVisibility = () => setVisible(onScreen && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      loader.disconnect();
      viewer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const toggle = () => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  };

  const goTo = (i: number) => {
    seekRef.current = STAGES[i].start + 0.01;
    setStage(i);
  };

  const onStage = useCallback((i: number) => setStage(i), []);
  const current = STAGES[stage];
  const stormy = Boolean(current.rain);

  return (
    <section className="relative overflow-hidden bg-white py-24 lg:py-32" aria-labelledby="sistema-titulo">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <SectionHeading
            className="lg:col-span-7"
            eyebrow="El sistema, paso a paso"
            title={
              <span id="sistema-titulo">
                Así impermeabilizamos <span className="text-ink-500">una cubierta</span>
              </span>
            }
            intro="De una cubierta con filtraciones a una membrana de poliurea continua y estanca: el mismo proceso que seguimos en cada obra, en 3D."
          />
          <ul className="flex flex-wrap gap-2 lg:col-span-5 lg:justify-end">
            {FACTS.map((f) => (
              <li key={f.text} className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-sm font-bold text-ink-800">
                <f.icon className="size-4 text-laser-600" /> {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[2rem] border border-ink-200 shadow-[0_40px_90px_-50px_rgb(0_0_0/0.55)]">
          {/* Cielo: despejado mientras se trabaja, de tormenta cuando llueve */}
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-gradient-to-b from-[#dfe6ec] via-[#eef1f2] to-[#f7f5f1] transition-opacity duration-[1400ms] ${stormy ? "opacity-0" : "opacity-100"}`}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-gradient-to-b from-[#5d6b78] via-[#8996a1] to-[#c4c9cc] transition-opacity duration-[1400ms] ${stormy ? "opacity-100" : "opacity-0"}`}
          />

          <div ref={card} className="relative aspect-[4/5] w-full sm:aspect-[16/11] lg:aspect-[16/9]">
            {ready === "ok" && near ? (
              <RoofScene playingRef={playingRef} seekRef={seekRef} onStage={onStage} active={visible} small={small} />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm font-bold text-ink-500">
                {ready === "no-webgl" ? "Tu navegador no puede mostrar la animación 3D." : "Cargando la animación 3D…"}
              </div>
            )}
            <p className="sr-only">
              Animación en 3D de una cubierta en sección: primero llueve y el agua se filtra por las fisuras; después se prepara el
              soporte, se aplica la imprimación, se proyecta la poliurea en caliente formando una membrana continua que sube por
              petos y lucernario, se aplica el acabado de protección UV y, al volver a llover, el agua corre hacia el sumidero sin
              filtrarse. Al final se ven las capas del sistema por separado.
            </p>

            {/* Rótulo del paso actual (en pantallas grandes, sobre la escena) */}
            <div className="pointer-events-none absolute top-5 left-5 hidden max-w-sm rounded-2xl bg-white/85 p-5 shadow-[0_20px_40px_-25px_rgb(0_0_0/0.5)] backdrop-blur-md sm:block" aria-live="polite">
              <p className="text-xs font-extrabold tracking-[0.2em] text-laser-700 uppercase">
                Paso {stage + 1} de {STAGES.length}
              </p>
              <p className="mt-1 font-display text-2xl leading-tight font-bold text-ink-900">{current.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{current.text}</p>
            </div>

            <button
              type="button"
              onClick={toggle}
              className="absolute top-5 right-5 grid size-11 place-items-center rounded-full bg-white/90 text-ink-900 shadow-lg backdrop-blur transition-colors hover:bg-laser-500"
              aria-label={playing ? "Pausar la animación" : "Reproducir la animación"}
              title={playing ? "Pausar" : "Reproducir"}
            >
              {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
            </button>
          </div>

          {/* Pasos: se puede saltar a cualquiera; la barra avanza con la animación */}
          <div className="relative border-t border-ink-200/70 bg-white/80 backdrop-blur-md">
            <div className="p-5 sm:hidden" aria-live="polite">
              <p className="text-xs font-extrabold tracking-[0.2em] text-laser-700 uppercase">
                Paso {stage + 1} de {STAGES.length}
              </p>
              <p className="mt-1 font-display text-2xl leading-tight font-bold text-ink-900">{current.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{current.text}</p>
            </div>
            <ol className="no-scrollbar flex overflow-x-auto sm:grid sm:grid-cols-7">
              {STAGES.map((s, i) => {
                const on = i === stage;
                return (
                  <li key={s.key} className="min-w-[8.5rem] flex-1 sm:min-w-0">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={on ? "step" : undefined}
                      className={`group relative w-full px-4 pt-4 pb-5 text-left transition-colors ${on ? "bg-ink-950 text-white" : "text-ink-600 hover:bg-ink-50"}`}
                    >
                      <span className={`block font-display text-sm font-bold ${on ? "text-laser-500" : "text-ink-400"}`}>{String(i + 1).padStart(2, "0")}</span>
                      <span className="mt-0.5 block text-sm leading-tight font-bold">{s.short}</span>
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-ink-200/60">
                        {on && (
                          <span
                            key={`${stage}-${s.start}`}
                            className="block h-full origin-left bg-laser-500"
                            style={{
                              animation: `roof-step ${s.end - s.start}s linear forwards`,
                              animationPlayState: playing && visible ? "running" : "paused",
                            }}
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
