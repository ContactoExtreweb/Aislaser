"use client";

import { ImageOff, LoaderCircle, RefreshCw } from "lucide-react";
import { useRef } from "react";
import { imageFilesFrom } from "@/lib/dossier/image";
import { ImageDropzone } from "./ImageDropzone";
import { RichText } from "./RichText";
import type { DossierEditorApi } from "./useDossierEditor";

const field =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25";

export function DetailsCard({ api }: { api: DossierEditorApi }) {
  const { dossier } = api;
  const coverUpload = api.uploads.cover?.[0];
  const replaceRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-label="Portada del dosier" className="rounded-[1.75rem] border border-ink-200 bg-white shadow-[0_20px_50px_-40px_rgb(0_0_0/0.4)]">
      <header className="flex items-center gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
        <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-extrabold tracking-wider text-laser-500 uppercase">Portada</span>
        <p className="text-sm text-ink-500">Datos que aparecen en la primera página</p>
      </header>
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <label className="block">
            <span className="text-sm font-bold text-ink-800">Título del dosier *</span>
            <input
              value={dossier.title}
              onChange={(e) => api.setField("title", e.target.value)}
              className={`${field} font-display text-2xl font-bold`}
              placeholder="Ej.: Impermeabilización de cubierta con poliurea"
              maxLength={160}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink-800">Subtítulo</span>
            <input value={dossier.subtitle} onChange={(e) => api.setField("subtitle", e.target.value)} className={field} placeholder="Ej.: Dosier técnico de ejecución" maxLength={200} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-ink-800">Cliente</span>
              <input value={dossier.client_name} onChange={(e) => api.setField("client_name", e.target.value)} className={field} placeholder="Nombre del cliente" maxLength={160} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink-800">Obra / ubicación</span>
              <input value={dossier.location} onChange={(e) => api.setField("location", e.target.value)} className={field} placeholder="Ej.: Mérida (Badajoz)" maxLength={160} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink-800">Fecha</span>
              <input type="date" value={dossier.work_date ?? ""} onChange={(e) => api.setField("work_date", e.target.value || null)} className={field} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink-800">Referencia</span>
              <input value={dossier.reference} onChange={(e) => api.setField("reference", e.target.value)} className={field} placeholder="Ej.: OBR-2026-014" maxLength={60} />
            </label>
          </div>
        </div>

        <div className="lg:col-span-2">
          <span className="text-sm font-bold text-ink-800">Foto de portada</span>
          <div className="mt-1.5">
            {dossier.cover_url || coverUpload ? (
              <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-200 bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUpload?.preview ?? dossier.cover_url!} alt="Portada" className={`size-full object-cover ${coverUpload ? "opacity-50" : ""}`} />
                {coverUpload ? (
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold">
                      <LoaderCircle className="size-4 animate-spin" /> Subiendo…
                    </span>
                  </span>
                ) : (
                  <div className="absolute inset-x-3 bottom-3 flex gap-2">
                    <button type="button" onClick={() => replaceRef.current?.click()} className="btn !px-3 !py-2 flex-1 bg-white text-xs text-ink-900 shadow">
                      <RefreshCw className="size-3.5" /> Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("¿Quitar la foto de portada?")) void api.removeCover();
                      }}
                      className="btn !px-3 !py-2 bg-white text-xs text-red-600 shadow"
                    >
                      <ImageOff className="size-3.5" /> Quitar
                    </button>
                  </div>
                )}
                <input
                  ref={replaceRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const [file] = imageFilesFrom(e.target.files);
                    if (file) void api.setCover(file);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : (
              <ImageDropzone label="Añadir foto de portada" onFiles={(files) => files[0] && api.setCover(files[0])} />
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <span className="text-sm font-bold text-ink-800">Introducción (opcional)</span>
          <p className="text-xs text-ink-500">Texto que aparece antes del punto 1. Puedes dejarlo vacío.</p>
          <div className="mt-2">
            <RichText value={dossier.intro} onChange={(html) => api.setField("intro", html)} placeholder="Breve descripción de la obra y del objeto del dosier…" minHeight={90} />
          </div>
        </div>
      </div>
    </section>
  );
}
