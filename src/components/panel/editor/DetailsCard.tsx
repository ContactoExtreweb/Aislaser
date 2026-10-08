"use client";

import Link from "next/link";
import { useRef } from "react";
import { Check, ImageOff, LoaderCircle, PenLine, RefreshCw, Settings } from "lucide-react";
import { imageFilesFrom } from "@/lib/dossier/image";
import type { Branding, DossierTemplate } from "@/lib/dossier/types";
import { ImageDropzone } from "./ImageDropzone";
import { RichText } from "./RichText";
import type { DossierEditorApi } from "./useDossierEditor";

const field =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25";

const card = "rounded-[1.75rem] border border-ink-200 bg-white shadow-[0_20px_50px_-40px_rgb(0_0_0/0.4)]";

export function DetailsCard({ api }: { api: DossierEditorApi }) {
  const informe = api.dossier.template === "informe";
  return (
    <>
      <TemplatePicker value={api.dossier.template} onChange={(t) => api.setField("template", t)} />
      {informe ? <InformeHeader api={api} /> : <CoverDetails api={api} />}
    </>
  );
}

/* ----------------------------- Tipo de documento ----------------------------- */

function TemplatePicker({ value, onChange }: { value: DossierTemplate; onChange: (t: DossierTemplate) => void }) {
  const options: { value: DossierTemplate; title: string; text: string }[] = [
    { value: "informe", title: "Informe técnico", text: "Formato carta con el membrete de Aislaser, como tus informes de siempre." },
    { value: "portada", title: "Dosier con portada", text: "Portada con foto grande, ideal para reportajes fotográficos de obra." },
  ];
  return (
    <div role="radiogroup" aria-label="Tipo de documento" className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-all ${
              active ? "border-ink-900 shadow-[0_15px_35px_-25px_rgb(0_0_0/0.6)]" : "border-ink-200 hover:border-ink-400"
            }`}
          >
            <MiniPage kind={o.value} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">
                {o.title}
                {active && (
                  <span className="grid size-5 place-items-center rounded-full bg-laser-500">
                    <Check className="size-3 text-ink-900" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-ink-500">{o.text}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Miniatura esquemática de cada formato */
function MiniPage({ kind }: { kind: DossierTemplate }) {
  return (
    <span aria-hidden="true" className="relative h-[72px] w-[52px] shrink-0 overflow-hidden rounded-md border border-ink-200 bg-white shadow-sm">
      {kind === "informe" ? (
        <>
          <span className="absolute top-1.5 left-2 h-1.5 w-5 rounded-sm bg-ink-700" />
          <span className="absolute top-[13px] left-2 h-[2px] w-6 bg-[#ffc000]" />
          <span className="absolute top-6 left-2 h-[2px] w-7 bg-ink-300" />
          <span className="absolute top-[29px] left-2 h-[2px] w-8 bg-ink-300" />
          <span className="absolute top-[35px] left-3 h-[3px] w-7 bg-laser-500" />
          <span className="absolute top-[42px] left-2 right-2 h-[2px] bg-ink-200" />
          <span className="absolute top-[46px] left-2 right-2 h-[2px] bg-ink-200" />
          <span className="absolute top-[50px] left-2 right-3 h-[2px] bg-ink-200" />
          <span className="absolute bottom-1.5 left-1.5 right-1.5 h-[2px] bg-[#ffc000]" />
        </>
      ) : (
        <>
          <span className="absolute top-1.5 left-1.5 h-1.5 w-4 rounded-sm bg-ink-700" />
          <span className="absolute top-4 right-1.5 left-1.5 h-7 rounded-sm bg-ink-400" />
          <span className="absolute top-[46px] left-1.5 h-1.5 w-8 rounded-sm bg-ink-800" />
          <span className="absolute top-[52px] left-1.5 h-1.5 w-6 rounded-sm bg-ink-800" />
          <span className="absolute right-0 bottom-0 left-0 h-2 bg-ink-900" />
        </>
      )}
    </span>
  );
}

/* ------------------------------ Cabecera informe ----------------------------- */

function InformeHeader({ api }: { api: DossierEditorApi }) {
  const { dossier } = api;
  return (
    <section aria-label="Cabecera del informe" className={card}>
      <header className="flex items-center gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
        <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-extrabold tracking-wider text-laser-500 uppercase">Cabecera</span>
        <p className="text-sm text-ink-500">Aparece debajo del membrete, al principio del informe</p>
      </header>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        <label className="block">
          <span className="text-sm font-bold text-ink-800">A/A del técnico</span>
          <input value={dossier.attention} onChange={(e) => api.setField("attention", e.target.value)} className={field} placeholder="Ej.: Sr. Juan Martínez" maxLength={160} />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink-800">Para (cliente)</span>
          <input value={dossier.client_name} onChange={(e) => api.setField("client_name", e.target.value)} className={field} placeholder="Ej.: Nombre de la empresa" maxLength={160} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-ink-800">Informe realizado por</span>
          <input value={dossier.prepared_by} onChange={(e) => api.setField("prepared_by", e.target.value)} className={field} placeholder="TÉCNICOS DE AISLASER" maxLength={160} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-ink-800">Título del informe *</span>
          <span className="block text-xs text-ink-500">Sale centrado y resaltado en amarillo.</span>
          <input
            value={dossier.title}
            onChange={(e) => api.setField("title", e.target.value)}
            className={`${field} font-bold`}
            placeholder="Ej.: Informe de filtraciones en la cubierta del edificio de oficinas de…"
            maxLength={200}
          />
        </label>
        <div className="sm:col-span-2">
          <span className="text-sm font-bold text-ink-800">Introducción (opcional)</span>
          <p className="text-xs text-ink-500">Texto antes del punto 1. Normalmente se deja vacío.</p>
          <div className="mt-2">
            <RichText value={dossier.intro} onChange={(html) => api.setField("intro", html)} placeholder="Opcional…" minHeight={60} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Portada dosier ------------------------------ */

function CoverDetails({ api }: { api: DossierEditorApi }) {
  const { dossier } = api;
  const coverUpload = api.uploads.cover?.[0];
  const replaceRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-label="Portada del dosier" className={card}>
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
              maxLength={200}
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

/* ------------------------------- Cierre y firma ------------------------------ */

export function ClosingCard({ api, branding, demo }: { api: DossierEditorApi; branding: Branding; demo: boolean }) {
  const { dossier } = api;
  const informe = dossier.template === "informe";
  const hasImages = Boolean(branding.stampUrl || branding.signatureUrl);

  return (
    <section aria-label="Cierre y firma" className={card}>
      <header className="flex items-center gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
        <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-extrabold tracking-wider text-laser-500 uppercase">Cierre y firma</span>
        <p className="text-sm text-ink-500">{informe ? "Va al final, después del último punto" : "Opcional al final del dosier"}</p>
      </header>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        <label className="block">
          <span className="text-sm font-bold text-ink-800">Lugar</span>
          <input value={dossier.issue_place} onChange={(e) => api.setField("issue_place", e.target.value)} className={field} placeholder="Campanario" maxLength={80} />
        </label>
        {informe && (
          <label className="block">
            <span className="text-sm font-bold text-ink-800">Fecha del informe</span>
            <input type="date" value={dossier.work_date ?? ""} onChange={(e) => api.setField("work_date", e.target.value || null)} className={field} />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-bold text-ink-800">Firmante</span>
          <input value={dossier.signer_name} onChange={(e) => api.setField("signer_name", e.target.value)} className={field} placeholder={branding.signerName} maxLength={120} />
          <span className="mt-1 block text-xs text-ink-500">Si lo dejas vacío se usa «{branding.signerName}».</span>
        </label>

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink-200 p-4">
            <input
              type="checkbox"
              className="size-5 accent-ink-900"
              checked={dossier.show_signature}
              onChange={(e) => api.setField("show_signature", e.target.checked)}
            />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-bold text-ink-900">
                <PenLine className="size-4" /> Poner sello y firma
              </span>
              <span className="block text-sm text-ink-500">
                {hasImages
                  ? "Se añaden las imágenes guardadas en Ajustes."
                  : demo
                    ? "En la versión real se usan el sello y la firma que subas en Ajustes."
                    : "Aún no has subido el sello y la firma: se dejará el hueco para firmar a mano."}
              </span>
            </span>
            {hasImages && (
              <span className="flex h-12 items-end gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {branding.stampUrl && <img src={branding.stampUrl} alt="Sello" className="h-12 w-auto" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {branding.signatureUrl && <img src={branding.signatureUrl} alt="Firma" className="h-10 w-auto" />}
              </span>
            )}
          </label>
          {!demo && (
            <Link href="/panel/ajustes" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-ink-700 underline underline-offset-2">
              <Settings className="size-4" /> {hasImages ? "Cambiar sello, firma o firmante" : "Subir el sello y la firma en Ajustes"}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
