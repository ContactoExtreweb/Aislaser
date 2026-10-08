"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, LoaderCircle, Trash2, TriangleAlert, X } from "lucide-react";
import type { DossierPoint } from "@/lib/dossier/types";
import { ImageDropzone } from "./ImageDropzone";
import type { DossierEditorApi, PendingUpload } from "./useDossierEditor";

const layouts = [
  { value: "grid-1", label: "1 por fila", cols: 1 },
  { value: "grid-2", label: "2 por fila", cols: 2 },
  { value: "grid-3", label: "3 por fila", cols: 3 },
] as const;

export function PointImages({
  point,
  pending,
  api,
}: {
  point: DossierPoint;
  pending: PendingUpload[];
  api: DossierEditorApi;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const hasImages = point.images.length > 0 || pending.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-ink-900">
          Fotos de este punto{" "}
          <span className="font-semibold text-ink-400">({point.images.length})</span>
        </p>
        {point.images.length > 0 && (
          <div className="flex items-center gap-1 rounded-xl bg-ink-100 p-1" role="radiogroup" aria-label="Fotos por fila en el documento">
            {layouts.map((l) => {
              const active = point.image_layout === l.value;
              return (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => api.updatePoint(point.id, { image_layout: l.value }, true)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    active ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
                  }`}
                  title={`${l.label} en el documento`}
                >
                  <span className="flex gap-0.5">
                    {Array.from({ length: l.cols }).map((_, i) => (
                      <span key={i} className={`h-3 rounded-[2px] ${active ? "bg-laser-500" : "bg-ink-300"} ${l.cols === 1 ? "w-5" : l.cols === 2 ? "w-2.5" : "w-1.5"}`} />
                    ))}
                  </span>
                  {l.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className={`mt-4 grid gap-3 ${hasImages ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : ""}`}>
        {point.images.map((img, i) => (
          <figure
            key={img.id}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragIndex !== null) {
                e.preventDefault();
                setOverIndex(i);
              }
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDrop={(e) => {
              if (dragIndex !== null) {
                e.preventDefault();
                e.stopPropagation();
                api.moveImage(point.id, dragIndex, i);
              }
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`group overflow-hidden rounded-2xl border bg-white transition-all ${
              overIndex === i && dragIndex !== i ? "border-laser-500 ring-4 ring-laser-500/30" : "border-ink-200"
            } ${dragIndex === i ? "opacity-40" : ""}`}
          >
            <div className="relative aspect-[4/3] bg-ink-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption || `Foto ${i + 1}`} className="size-full object-cover" draggable={false} />
              <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-ink-900/80 text-xs font-bold text-white">{i + 1}</span>
              <span className="absolute top-2 right-2 hidden cursor-grab rounded-lg bg-white/90 p-1 text-ink-600 md:block" title="Arrastra para cambiar el orden">
                <GripVertical className="size-4" />
              </span>
              <div className="absolute inset-x-2 bottom-2 flex justify-between opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => api.moveImage(point.id, i, i - 1)}
                    className="grid size-8 place-items-center rounded-lg bg-white/95 text-ink-800 shadow disabled:opacity-40"
                    aria-label="Mover foto a la izquierda"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === point.images.length - 1}
                    onClick={() => api.moveImage(point.id, i, i + 1)}
                    className="grid size-8 place-items-center rounded-lg bg-white/95 text-ink-800 shadow disabled:opacity-40"
                    aria-label="Mover foto a la derecha"
                  >
                    <ArrowRight className="size-4" />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("¿Quitar esta foto del dosier?")) void api.deleteImage(point.id, img);
                  }}
                  className="grid size-8 place-items-center rounded-lg bg-red-600 text-white shadow hover:bg-red-700"
                  aria-label="Eliminar foto"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <input
              value={img.caption}
              onChange={(e) => api.updateCaption(point.id, img.id, e.target.value)}
              placeholder="Pie de foto (opcional)"
              className="w-full border-t border-ink-100 px-3 py-2.5 text-sm text-ink-800 outline-none placeholder:text-ink-400 focus:bg-laser-500/10"
              maxLength={200}
            />
          </figure>
        ))}

        {pending.map((u) => (
          <div key={u.id} className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white">
            <div className="relative aspect-[4/3] bg-ink-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.preview} alt="" className="size-full object-cover opacity-50" />
              <div className="absolute inset-0 grid place-items-center">
                {u.error ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-center text-xs font-bold text-red-600">
                    <TriangleAlert className="size-5" /> {u.error}
                    <button type="button" onClick={() => api.dismissUpload(point.id, u.id)} className="flex items-center gap-1 text-ink-600">
                      <X className="size-3" /> Quitar
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink-800">
                    <LoaderCircle className="size-4 animate-spin" /> Subiendo…
                  </span>
                )}
              </div>
            </div>
            <div className="h-[41px] border-t border-ink-100" />
          </div>
        ))}

        <div className={hasImages ? "" : "col-span-full"}>
          <ImageDropzone compact={hasImages} label={hasImages ? "Añadir más" : "Añade las fotos de este punto"} onFiles={(files) => api.uploadImages(point.id, files)} />
        </div>
      </div>
    </div>
  );
}
