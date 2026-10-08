"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { imageFilesFrom } from "@/lib/dossier/image";
import type { DossierPoint, DossierTemplate } from "@/lib/dossier/types";
import { PointImages } from "./PointImages";
import { RichText } from "./RichText";
import type { DossierEditorApi, PendingUpload } from "./useDossierEditor";

export function PointCard({
  point,
  index,
  total,
  pending,
  api,
  template,
}: {
  point: DossierPoint;
  index: number;
  total: number;
  pending: PendingUpload[];
  api: DossierEditorApi;
  template: DossierTemplate;
}) {
  const informe = template === "informe";
  return (
    <section
      id={`punto-${point.id}`}
      aria-label={`Punto ${index + 1}`}
      className="scroll-mt-28 rounded-[1.75rem] border border-ink-200 bg-white shadow-[0_20px_50px_-40px_rgb(0_0_0/0.4)]"
      onPaste={(e) => {
        // Pegar una imagen en cualquier campo del punto la añade a sus fotos
        if (e.defaultPrevented) return;
        const files = imageFilesFrom(e.clipboardData.files);
        if (files.length) {
          e.preventDefault();
          void api.uploadImages(point.id, files);
        }
      }}
    >
      <header className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 sm:px-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-laser-500 font-display text-2xl font-bold text-ink-900">
          {index + 1}
        </span>
        <input
          value={point.title}
          onChange={(e) => api.updatePoint(point.id, { title: e.target.value })}
          placeholder={informe ? `Título del apartado ${index + 1} (ej.: Objeto del informe)` : `Título del punto ${index + 1} (opcional)`}
          className={`min-w-0 flex-1 rounded-xl px-2 py-2 font-display text-xl font-bold text-ink-900 outline-none placeholder:font-sans placeholder:text-base placeholder:font-semibold placeholder:normal-case placeholder:text-ink-400 hover:bg-ink-50 focus:bg-ink-50 sm:text-2xl ${
            informe ? "uppercase" : ""
          }`}
          maxLength={160}
        />
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => api.movePoint(point.id, -1)}
            disabled={index === 0}
            className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
            aria-label="Subir punto"
            title="Subir punto"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => api.movePoint(point.id, 1)}
            disabled={index === total - 1}
            className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
            aria-label="Bajar punto"
            title="Bajar punto"
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const msg = point.images.length
                ? `¿Eliminar el punto ${index + 1} y sus ${point.images.length} fotos? No se puede deshacer.`
                : `¿Eliminar el punto ${index + 1}?`;
              if (confirm(msg)) void api.deletePoint(point.id);
            }}
            className="grid size-9 place-items-center rounded-xl text-ink-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Eliminar punto"
            title="Eliminar punto"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-6">
        <RichText
          value={point.body}
          onChange={(html) => api.updatePoint(point.id, { body: html })}
          onImages={(files) => void api.uploadImages(point.id, files)}
          placeholder="Explica este punto: qué se ha hecho, materiales, observaciones…"
        />
        <PointImages point={point} pending={pending} api={api} />
      </div>
    </section>
  );
}
