"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import type { ProjectImage } from "@/content/projects";

export function Gallery({ images, title }: { images: ProjectImage[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i === null ? i : (i + dir + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, go]);

  return (
    <>
      {/* Las fotografías de la web anterior son de 720 px: rejilla a 2 columnas para no ampliarlas en exceso */}
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((img, i) => {
          // Las fotos verticales (las del móvil) se enseñan enteras, sin recortar, sobre fondo oscuro
          const portrait = img.height > img.width;
          const wide = i === 0 && images.length % 2 === 1 && !portrait;
          return (
            <button
              key={img.src}
              type="button"
              onClick={() => setIndex(i)}
              className={`group relative aspect-[3/2] overflow-hidden rounded-[1.5rem] ${portrait ? "bg-ink-900" : "bg-ink-100"} ${
                wide ? "sm:col-span-2 sm:aspect-[2/1]" : ""
              }`}
              aria-label={`Ampliar fotografía ${i + 1} de ${title}`}
            >
              <Image
                src={img.src}
                alt={img.alt || `${title}, fotografía ${i + 1}`}
                fill
                sizes={wide ? "(min-width: 1280px) 1200px, 100vw" : "(min-width: 1280px) 600px, (min-width: 640px) 50vw, 100vw"}
                className={`${portrait ? "object-contain" : "object-cover"} transition-transform duration-700 group-hover:scale-105`}
              />
              <span className="absolute inset-0 bg-ink-950/0 transition-colors group-hover:bg-ink-950/30" />
              <span className="absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink-900 opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 className="size-4" />
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${title}`}
          onClick={() => setIndex(null)}
        >
          <div className="relative h-[80vh] w-[92vw] max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[index].src} alt={images[index].alt || `${title}, fotografía ${index + 1}`} fill sizes="92vw" className="object-contain" fetchPriority="high" />
          </div>
          <p className="absolute top-6 left-6 text-sm font-bold text-white/80">
            {index + 1} / {images.length}
          </p>
          <button type="button" onClick={() => setIndex(null)} className="absolute top-4 right-4 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Cerrar">
            <X className="size-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-4 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-laser-500 hover:text-ink-900"
                aria-label="Anterior"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-4 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-laser-500 hover:text-ink-900"
                aria-label="Siguiente"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
