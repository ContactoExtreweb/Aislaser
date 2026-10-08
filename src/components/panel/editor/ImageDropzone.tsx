"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { imageFilesFrom } from "@/lib/dossier/image";

/** Zona grande para añadir fotos: arrastrar, pulsar, pegar (Ctrl+V) o hacer una foto con el móvil */
export function ImageDropzone({
  onFiles,
  compact = false,
  label = "Añadir fotos",
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const files = imageFilesFrom(e.dataTransfer.files);
        setOver(false);
        if (files.length) {
          e.preventDefault();
          onFiles(files);
        }
      }}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition-all ${
        over ? "scale-[1.01] border-laser-500 bg-laser-500/10" : "border-ink-300 bg-ink-50 hover:border-ink-500"
      } ${compact ? "min-h-[150px] p-4" : "min-h-[180px] p-6"}`}
    >
      <span className={`grid place-items-center rounded-2xl bg-white shadow-sm ${compact ? "size-11" : "size-14"} ${over ? "text-ink-900" : "text-ink-500"}`}>
        <ImagePlus className={compact ? "size-5" : "size-6"} />
      </span>
      <div>
        <p className="font-bold text-ink-900">{over ? "¡Suelta las fotos aquí!" : label}</p>
        {!compact && <p className="mt-1 text-sm text-ink-500">Arrástralas aquí, pulsa el botón o pégalas con Ctrl+V</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-dark !px-4 !py-2.5 text-sm">
          <ImagePlus className="size-4" /> Elegir fotos
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="btn !px-4 !py-2.5 border border-ink-300 bg-white text-sm text-ink-800 hover:border-ink-900 sm:hidden"
        >
          <Camera className="size-4" /> Hacer foto
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onFiles(imageFilesFrom(e.target.files));
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          onFiles(imageFilesFrom(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
