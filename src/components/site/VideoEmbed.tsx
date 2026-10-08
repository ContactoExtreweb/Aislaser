"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";

/** Vídeo de YouTube que sólo se carga al pulsar (sin cookies de terceros hasta entonces) */
export function VideoEmbed({ id, title, poster }: { id: string; title: string; poster: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-ink-900 shadow-2xl">
      {playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 size-full" aria-label={`Reproducir vídeo: ${title}`}>
          <Image src={poster} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-70 transition-transform duration-1000 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
          <span className="absolute top-1/2 left-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-laser-500 text-ink-900 shadow-[0_0_0_14px_rgb(255_206_0/0.25)] transition-transform duration-500 group-hover:scale-110">
            <Play className="ml-1 size-9 fill-current" />
          </span>
          <span className="absolute bottom-6 left-6 text-left text-sm font-bold text-white/90">
            Al reproducir se cargará contenido de YouTube
          </span>
        </button>
      )}
    </div>
  );
}
