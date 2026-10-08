"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  ExternalLink,
  EyeOff,
  LoaderCircle,
  Save,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import {
  addObraPhoto,
  deleteObra,
  deleteObraPhoto,
  reorderObraPhotos,
  saveObra,
  updateObraPhotoAlt,
  type ObraResult,
} from "@/app/panel/obras-actions";
import { ImageDropzone } from "@/components/panel/editor/ImageDropzone";
import { sectors, type Sector } from "@/content/projects";
import { services } from "@/content/services";
import { imageFilesFrom, prepareImage } from "@/lib/dossier/image";
import { OBRA_LIMITS, type WebFoto, type WebObra } from "@/lib/obras-shared";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { GALLERY_BUCKET, galleryImageUrl } from "@/lib/supabase/env";

const field =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25";
const card = "rounded-[1.75rem] border border-ink-200 bg-white shadow-[0_20px_50px_-40px_rgb(0_0_0/0.4)]";

/** Las fotos de la web se guardan a 2000 px como mucho: nítidas en pantalla grande y ligeras */
const MAX_SIDE = 2000;

const errorText = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (/exceeded the maximum allowed size|too large|413/i.test(msg)) return "la foto pesa más de 5 MB";
  if (/mime type|not supported/i.test(msg)) return "formato de imagen no admitido";
  if (/jwt|unauthori[sz]ed|row-level security|403/i.test(msg)) return "la sesión ha caducado: vuelve a entrar en el panel";
  return msg;
};

/** Nombre único para cada foto (randomUUID sólo existe en HTTPS o localhost) */
function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function ObraEditor({ obra, fotos }: { obra: WebObra; fotos: WebFoto[] }) {
  const router = useRouter();
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const uploadingRef = useRef(false);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [photoBusy, startPhotoBusy] = useTransition();

  /* ------------------------------ Fotos ------------------------------ */

  async function uploadFiles(files: File[]) {
    if (!files.length || uploadingRef.current) return;
    uploadingRef.current = true;
    setPhotoErrors([]);
    setUpload({ done: 0, total: files.length });
    const bucket = getSupabaseBrowser().storage.from(GALLERY_BUCKET);
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      try {
        const { blob, width, height } = await prepareImage(file, { maxSide: MAX_SIDE, quality: 0.8 });
        const path = `${obra.id}/${randomId()}.jpg`;
        // Las rutas no se reutilizan nunca: el navegador puede guardar las fotos un año
        const { error } = await bucket.upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
        if (error) throw new Error(error.message);
        const result = await addObraPhoto(obra.id, path, width, height);
        if (result.error) throw new Error(result.error);
      } catch (e) {
        const msg = errorText(e);
        failed.push(msg.startsWith("«") ? msg : `${file.name || `Foto ${i + 1}`}: ${msg}`);
      }
      setUpload({ done: i + 1, total: files.length });
    }
    uploadingRef.current = false;
    setUpload(null);
    setPhotoErrors(failed);
    router.refresh();
  }

  // Pegar fotos con Ctrl+V en cualquier parte de la ficha
  const uploadRef = useRef(uploadFiles);
  uploadRef.current = uploadFiles;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = imageFilesFrom(e.clipboardData?.files);
      if (files.length) {
        e.preventDefault();
        void uploadRef.current(files);
      }
    };
    // Si una foto se suelta fuera de la zona, que el navegador no la abra y se pierda lo escrito
    const preventDrop = (e: DragEvent) => {
      if (Array.from(e.dataTransfer?.types ?? []).includes("Files")) e.preventDefault();
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", preventDrop);
    window.addEventListener("drop", preventDrop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", preventDrop);
      window.removeEventListener("drop", preventDrop);
    };
  }, []);

  const runPhoto = (action: () => Promise<ObraResult>) =>
    startPhotoBusy(async () => {
      setPhotoErrors([]);
      const result = await action();
      if (result.error) setPhotoErrors([result.error]);
    });

  const moveTo = (from: number, to: number) => {
    const ids = fotos.map((f) => f.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    runPhoto(() => reorderObraPhotos(obra.id, ids));
  };

  const photosBusy = photoBusy || upload !== null;

  /* ------------------------------ Datos ------------------------------ */

  const [saving, startSaving] = useTransition();
  const [result, setResult] = useState<ObraResult>({});
  const [dirty, setDirty] = useState(false);
  const intentRef = useRef<"save" | "publish" | "unpublish">("save");
  const formRef = useRef<HTMLFormElement>(null);
  const [sector, setSector] = useState(obra.sector ?? "");

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("intent", intentRef.current);
    intentRef.current = "save"; // Intro dentro de un campo = guardar sin cambiar el estado
    startSaving(async () => {
      setResult({});
      const r = await saveObra(obra.id, formData);
      setResult(r);
      if (!r.error) setDirty(false);
    });
  }

  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ready = { photos: fotos.length > 0, sector: Boolean(sector) };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link
        href="/panel/obras"
        onClick={(e) => {
          if (dirty && !confirm("Hay cambios sin guardar. ¿Salir igualmente?")) e.preventDefault();
        }}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" /> Obras de la web
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto min-w-0 text-4xl font-bold break-words sm:text-5xl">{obra.titulo}</h1>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-extrabold tracking-wider uppercase ${
            obra.publicada ? "bg-emerald-500 text-white" : "bg-ink-100 text-ink-700"
          }`}
        >
          {obra.publicada ? "En la web" : "Borrador: no se ve en la web"}
        </span>
        {obra.publicada && (
          <Link href={`/obras/${obra.slug}`} target="_blank" className="btn-ghost-dark !px-4 !py-2 text-sm">
            Ver en la web <ExternalLink className="size-4" />
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-400">
        {obra.publicada ? "Dirección" : "Dirección cuando se publique"}: aislaser.es/obras/{obra.slug}
      </p>
      {obra.publicada && fotos.length === 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-laser-500/15 p-3 text-sm font-semibold text-ink-800">
          <AlertTriangle className="size-4" /> No sale en la web porque no tiene fotos: sube al menos una.
        </p>
      )}

      {/* ------------------------------ 1. Fotos ------------------------------ */}
      <section className={`${card} mt-8`} aria-labelledby="fotos-titulo">
        <header className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
          <span className="grid size-8 place-items-center rounded-lg bg-laser-500 font-display text-lg font-bold text-ink-900">1</span>
          <h2 id="fotos-titulo" className="text-2xl font-bold">
            Fotos
          </h2>
          <p className="text-sm text-ink-500">La primera es la portada. {fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`}</p>
        </header>
        <div className="space-y-5 p-4 sm:p-6">
          {upload ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-laser-500 bg-laser-500/10 p-6 text-center" role="status">
              <LoaderCircle className="size-8 animate-spin text-ink-700" />
              <p className="font-bold text-ink-900">
                Subiendo foto {Math.min(upload.done + 1, upload.total)} de {upload.total}…
              </p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-ink-900 transition-all" style={{ width: `${(upload.done / upload.total) * 100}%` }} />
              </div>
              <p className="text-xs text-ink-500">No cierres esta página hasta que termine.</p>
            </div>
          ) : (
            <ImageDropzone onFiles={uploadFiles} label="Añade las fotos de la obra (puedes elegir varias a la vez)" />
          )}

          {photoErrors.length > 0 && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-4" /> {photoErrors.length === 1 ? "Ha habido un problema" : "Algunas fotos no se han podido subir"}
              </p>
              <ul className="mt-1 list-disc pl-6">
                {photoErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {fotos.length > 0 && (
            <ul className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${photoBusy ? "opacity-70" : ""}`}>
              {fotos.map((f, i) => (
                <li key={f.id} className={`flex flex-col gap-2 rounded-2xl border p-2 ${i === 0 ? "border-laser-500 ring-4 ring-laser-500/20" : "border-ink-200"}`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-100">
                    <Image
                      src={galleryImageUrl(f.storage_path)}
                      alt={f.alt || `Foto ${i + 1}`}
                      fill
                      sizes="(min-width: 768px) 300px, 50vw"
                      className="object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-laser-500 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-ink-900 uppercase">
                        <Star className="size-3 fill-current" /> Portada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <IconButton label="Mover a la izquierda" disabled={photosBusy || i === 0} onClick={() => moveTo(i, i - 1)}>
                      <ChevronLeft className="size-5" />
                    </IconButton>
                    <IconButton label="Mover a la derecha" disabled={photosBusy || i === fotos.length - 1} onClick={() => moveTo(i, i + 1)}>
                      <ChevronRight className="size-5" />
                    </IconButton>
                    {i > 0 && (
                      <button
                        type="button"
                        disabled={photosBusy}
                        onClick={() => moveTo(i, 0)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-ink-600 hover:bg-laser-500/20 hover:text-ink-900 disabled:opacity-40"
                      >
                        <Star className="size-3.5" /> Portada
                      </button>
                    )}
                    <IconButton
                      label="Borrar foto"
                      danger
                      className="ml-auto"
                      disabled={photosBusy}
                      onClick={() => {
                        if (confirm(`¿Borrar la foto ${i + 1}? No se puede deshacer.`)) runPhoto(() => deleteObraPhoto(f.id));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                  <input
                    aria-label={`Qué se ve en la foto ${i + 1}`}
                    placeholder="Qué se ve (opcional)"
                    defaultValue={f.alt}
                    maxLength={OBRA_LIMITS.alt}
                    onBlur={(e) => {
                      const alt = e.target.value.trim();
                      if (alt !== f.alt) runPhoto(() => updateObraPhotoAlt(f.id, alt));
                    }}
                    className="w-full rounded-lg border border-ink-200 px-2.5 py-2 text-sm outline-none focus:border-ink-900"
                  />
                </li>
              ))}
            </ul>
          )}
          {photoBusy && (
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-500" role="status">
              <LoaderCircle className="size-4 animate-spin" /> Guardando…
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------ 2. Datos ------------------------------ */}
      <form ref={formRef} onSubmit={onSubmit} onChange={() => setDirty(true)} className={`${card} mt-6`} aria-labelledby="datos-titulo">
        <header className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
          <span className="grid size-8 place-items-center rounded-lg bg-laser-500 font-display text-lg font-bold text-ink-900">2</span>
          <h2 id="datos-titulo" className="text-2xl font-bold">
            Datos de la obra
          </h2>
        </header>
        <fieldset disabled={saving || deleting} className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink-800">Nombre de la obra</span>
            <input name="titulo" required defaultValue={obra.titulo} maxLength={OBRA_LIMITS.titulo} className={field} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink-800">Sector</span>
            <select name="sector" value={sector} onChange={(e) => setSector(e.target.value)} className={field}>
              <option value="">Elige un sector…</option>
              {(Object.keys(sectors) as Sector[]).map((s) => (
                <option key={s} value={s}>
                  {sectors[s].label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <label className="block">
              <span className="text-sm font-bold text-ink-800">Lugar</span>
              <input name="ubicacion" defaultValue={obra.ubicacion} maxLength={OBRA_LIMITS.ubicacion} placeholder="Mérida (Badajoz)" className={field} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-ink-800">Año</span>
              <input name="anio" defaultValue={obra.anio} maxLength={OBRA_LIMITS.anio} placeholder="2025" className={field} />
            </label>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-bold text-ink-800">Trabajos realizados (salen en la página de cada servicio)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((s) => (
                <label
                  key={s.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors has-[:checked]:border-ink-900 has-[:checked]:bg-ink-900 has-[:checked]:text-white"
                >
                  <input type="checkbox" name="servicios" value={s.slug} defaultChecked={obra.servicios.includes(s.slug)} className="accent-laser-500" />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink-800">Resumen</span>
            <span className="ml-2 text-xs text-ink-400">Una o dos frases. Sale debajo del título de la obra.</span>
            <textarea name="resumen" rows={2} defaultValue={obra.resumen} maxLength={OBRA_LIMITS.resumen} className={field} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-ink-800">Descripción</span>
            <span className="ml-2 text-xs text-ink-400">Opcional. Para hacer una lista, empieza cada línea con «- ».</span>
            <textarea
              name="descripcion"
              rows={6}
              defaultValue={obra.descripcion}
              maxLength={OBRA_LIMITS.descripcion}
              placeholder={"Impermeabilización de la cubierta de la piscina con poliurea proyectada en caliente.\n- Preparación y limpieza del soporte\n- Imprimación\n- Poliurea de 2 mm de espesor"}
              className={field}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 p-4 sm:col-span-2">
            <input type="checkbox" name="destacada" defaultChecked={obra.destacada} className="mt-1 size-5 accent-laser-500" />
            <span>
              <span className="flex items-center gap-1.5 font-bold text-ink-900">
                <Star className="size-4 text-laser-600" /> Destacar en la portada de la web
              </span>
              <span className="block text-sm text-ink-500">Sale en «Proyectos que hablan por nosotros» (se enseñan las 6 primeras destacadas).</span>
            </span>
          </label>
        </fieldset>

        <div className="border-t border-ink-100 p-4 sm:p-6">
          {!obra.publicada && (
            <ul className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              <li className={`flex items-center gap-2 ${ready.photos ? "text-emerald-700" : "text-ink-500"}`}>
                {ready.photos ? <CircleCheck className="size-4" /> : <CircleDashed className="size-4" />} Al menos una foto
              </li>
              <li className={`flex items-center gap-2 ${ready.sector ? "text-emerald-700" : "text-ink-500"}`}>
                {ready.sector ? <CircleCheck className="size-4" /> : <CircleDashed className="size-4" />} Sector elegido
              </li>
            </ul>
          )}

          {result.error && (
            <p className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {result.error}
            </p>
          )}
          {result.ok && !dirty && (
            <p className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
              <Check className="size-4" /> {result.ok}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {obra.publicada ? (
              <>
                <button type="submit" onClick={() => (intentRef.current = "save")} disabled={saving} className="btn-primary text-base">
                  {saving ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />} Guardar cambios
                </button>
                <button type="submit" onClick={() => (intentRef.current = "unpublish")} disabled={saving} className="btn-ghost-dark">
                  <EyeOff className="size-4" /> Quitar de la web
                </button>
              </>
            ) : (
              <>
                <button type="submit" onClick={() => (intentRef.current = "publish")} disabled={saving} className="btn-primary text-base">
                  {saving ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />} Guardar y publicar en la web
                </button>
                <button type="submit" onClick={() => (intentRef.current = "save")} disabled={saving} className="btn-ghost-dark">
                  <Save className="size-4" /> Guardar borrador
                </button>
              </>
            )}
            {dirty && !saving && <span className="text-sm font-semibold text-laser-700">Tienes cambios sin guardar</span>}
          </div>
        </div>
      </form>

      {/* ------------------------------ Eliminar ------------------------------ */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-red-100 bg-red-50/40 p-4 sm:p-6">
        <p className="text-sm text-ink-600">
          <strong className="text-ink-900">Eliminar la obra</strong> la quita de la web
          {fotos.length === 0 ? "" : fotos.length === 1 ? " y borra su foto" : ` y borra sus ${fotos.length} fotos`}. No se puede deshacer.
        </p>
        <button
          type="button"
          disabled={deleting || saving || photosBusy}
          onClick={() => {
            const what = fotos.length === 0 ? "" : fotos.length === 1 ? " y su foto" : ` y sus ${fotos.length} fotos`;
            if (!confirm(`¿Eliminar «${obra.titulo}»${what}? No se puede deshacer.`)) return;
            startDeleting(async () => {
              setDeleteError(null);
              setDirty(false);
              const r = await deleteObra(obra.id);
              if (r?.error) setDeleteError(r.error);
            });
          }}
          className="btn border border-red-200 bg-white !py-2.5 text-sm text-red-700 hover:border-red-600 hover:bg-red-600 hover:text-white"
        >
          {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Eliminar obra
        </button>
        {deleteError && (
          <p className="w-full text-sm font-semibold text-red-700" role="alert">
            {deleteError}
          </p>
        )}
      </div>
    </main>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  danger,
  className = "",
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg transition-colors disabled:opacity-30 ${
        danger ? "text-ink-400 hover:bg-red-50 hover:text-red-600" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
      } ${className}`}
    >
      {children}
    </button>
  );
}
