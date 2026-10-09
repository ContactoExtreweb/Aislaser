"use client";

import Image from "next/image";
import Link from "next/link";
import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";
import { actionFailed } from "./action-errors";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
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
  RotateCcw,
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
  if (/failed to fetch|network|load failed|server action/i.test(msg)) return "no se ha podido conectar; inténtalo otra vez";
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

type PhotoChange = { type: "order"; ids: string[] } | { type: "remove"; id: string };

/* Copia local de lo escrito en el formulario, por si se cierra la pestaña o caduca la sesión.
   Guarda también los valores de los que se partió: al recuperar sólo se aplican los campos que
   se cambiaron, para no deshacer lo guardado después desde otro dispositivo. */
type FormValues = {
  titulo: string;
  sector: string;
  ubicacion: string;
  anio: string;
  resumen: string;
  descripcion: string;
  destacada: boolean;
  servicios: string[];
};
type Draft = FormValues & { savedAt: number; base?: FormValues };
const DRAFT_FIELDS = ["titulo", "ubicacion", "anio", "resumen", "descripcion"] as const;
const VALUE_KEYS = [...DRAFT_FIELDS, "sector", "destacada", "servicios"] as const;
const draftKey = (id: string) => `aislaser:obra-sin-guardar:${id}`;

function readForm(form: HTMLFormElement): FormValues {
  const data = new FormData(form);
  return {
    ...(Object.fromEntries(DRAFT_FIELDS.map((k) => [k, String(data.get(k) ?? "")])) as Pick<FormValues, (typeof DRAFT_FIELDS)[number]>),
    sector: String(data.get("sector") ?? ""),
    destacada: data.get("destacada") === "on",
    servicios: data.getAll("servicios").map(String),
  };
}

const valuesOf = (o: WebObra): FormValues => ({
  titulo: o.titulo,
  ubicacion: o.ubicacion ?? "",
  anio: o.anio ?? "",
  resumen: o.resumen ?? "",
  descripcion: o.descripcion ?? "",
  sector: o.sector ?? "",
  destacada: o.destacada,
  servicios: o.servicios,
});

const sameValue = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b) ? [...a].sort().join() === [...b].sort().join() : typeof a === "string" ? a.trim() === String(b ?? "").trim() : a === b;

/** Campos que se cambiaron en la copia respecto a los valores de partida */
const changedKeys = (d: Draft) => VALUE_KEYS.filter((k) => !sameValue(d[k], (d.base ?? ({} as Partial<FormValues>))[k]));

/** ¿Aporta algo la copia frente a lo que hay guardado ahora? */
const draftHasNews = (d: Draft, o: WebObra) => {
  const saved = valuesOf(o);
  return changedKeys(d).some((k) => !sameValue(d[k], saved[k]));
};

export function ObraEditor({ obra, fotos: savedFotos }: { obra: WebObra; fotos: WebFoto[] }) {
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const uploadingRef = useRef(false);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [photoBusy, startPhotoBusy] = useTransition();
  // Mover y borrar se ven al instante; si el servidor falla, vuelve a como estaba
  const [fotos, changePhotos] = useOptimistic(savedFotos, (current: WebFoto[], change: PhotoChange) =>
    change.type === "remove"
      ? current.filter((f) => f.id !== change.id)
      : change.ids.map((id) => current.find((f) => f.id === id)).filter((f): f is WebFoto => Boolean(f)),
  );

  /* ------------------------------ Fotos ------------------------------ */

  // Las fotos que llegan mientras se sube un lote se añaden a la cola del mismo lote
  const queueRef = useRef<File[]>([]);

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    queueRef.current.push(...files);
    setUpload((u) => ({ done: u?.done ?? 0, total: (u?.total ?? 0) + files.length }));
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setPhotoErrors([]);
    const bucket = getSupabaseBrowser().storage.from(GALLERY_BUCKET);
    const failed: string[] = [];
    let done = 0;
    for (let file = queueRef.current.shift(); file; file = queueRef.current.shift()) {
      try {
        const { blob, width, height } = await prepareImage(file, { maxSide: MAX_SIDE, quality: 0.8 });
        const path = `${obra.id}/${randomId()}.jpg`;
        // Las rutas no se reutilizan nunca. Caché de un día: si se borra una foto, deja de
        // circular pronto (la web la sirve a través de su propio optimizador de imágenes)
        const { error } = await bucket.upload(path, blob, { contentType: "image/jpeg", cacheControl: "86400", upsert: false });
        if (error) throw new Error(error.message);
        // Registrar la foto (refresca la ficha). Si el servidor la rechaza, se borra el archivo; si
        // falla la conexión no: puede que el servidor sí la registrara y se quedaría una foto rota
        let result: ObraResult;
        try {
          result = await addObraPhoto(obra.id, path, width, height);
        } catch (e) {
          if (unstable_isUnrecognizedActionError(e)) await bucket.remove([path]).catch(() => {});
          throw new Error(actionFailed(e));
        }
        if (result.error) {
          await bucket.remove([path]).catch(() => {});
          throw new Error(result.error);
        }
      } catch (e) {
        const msg = errorText(e);
        failed.push(msg.startsWith("«") ? msg : `${file.name || `Foto ${done + 1}`}: ${msg}`);
      }
      done++;
      setUpload((u) => (u ? { ...u, done } : u));
    }
    uploadingRef.current = false;
    setUpload(null);
    setPhotoErrors(failed);
    // Sin router.refresh(): cada foto registrada ya refresca la ficha, y con la sesión caducada
    // un refresco llevaría al login y se perdería lo escrito
  }

  // Pegar fotos con Ctrl+V en cualquier parte de la ficha
  const uploadRef = useRef(uploadFiles);
  uploadRef.current = uploadFiles;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // En un campo de texto, si lo copiado trae texto (Excel o Word copian también una imagen del
      // texto), se pega el texto. Las capturas de pantalla no traen texto y se siguen subiendo
      const t = e.target as HTMLElement | null;
      const inField = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || Boolean(t?.isContentEditable);
      if (inField && e.clipboardData?.types.includes("text/plain")) return;
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

  const runPhoto = (action: () => Promise<ObraResult>, optimistic?: PhotoChange) =>
    startPhotoBusy(async () => {
      setPhotoErrors([]);
      if (optimistic) changePhotos(optimistic);
      try {
        const result = await action();
        if (result.error) setPhotoErrors([result.error]);
      } catch (e) {
        unstable_rethrow(e);
        setPhotoErrors([actionFailed(e)]);
      }
    });

  // Los textos de las fotos se guardan al salir del campo, sin bloquear los botones de las fotos
  // (si no, el clic en «Portada» justo después de escribir se perdería)
  const altPendingRef = useRef(new Map<string, string>());
  const saveAlt = async (id: string, alt: string) => {
    try {
      const result = await updateObraPhotoAlt(id, alt);
      if (result.error) setPhotoErrors([result.error]);
      else altPendingRef.current.delete(id);
    } catch (e) {
      setPhotoErrors([actionFailed(e)]);
    }
  };

  // Al salir de la ficha (también con «Atrás»): se para la cola de fotos que faltaban, como dice
  // el aviso, y se guardan los textos de fotos que se estaban escribiendo
  useEffect(
    () => () => {
      queueRef.current.length = 0;
      altPendingRef.current.forEach((alt, id) => void updateObraPhotoAlt(id, alt).catch(() => {}));
    },
    [],
  );

  // Con teclado, al mover una foto el botón cambia de sitio en la página y el navegador pierde el
  // foco: se devuelve al mismo botón de esa foto (o al otro botón si ha llegado a un extremo)
  const focusAfterMove = useRef<{ id: string; label: string } | null>(null);
  useEffect(() => {
    const target = focusAfterMove.current;
    if (!target) return;
    focusAfterMove.current = null;
    const li = document.querySelector(`[data-foto="${target.id}"]`);
    const buttons = [...(li?.querySelectorAll<HTMLButtonElement>("button") ?? [])].filter((b) => !b.disabled);
    (buttons.find((b) => b.getAttribute("aria-label") === target.label) ?? buttons[0])?.focus();
  }, [fotos]);

  const moveTo = (from: number, to: number, label?: string) => {
    const ids = fotos.map((f) => f.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    if (label && document.activeElement?.closest(`[data-foto="${moved}"]`)) focusAfterMove.current = { id: moved, label };
    runPhoto(() => reorderObraPhotos(obra.id, ids), { type: "order", ids });
  };

  const photosBusy = photoBusy || upload !== null;

  // Las fotos se pueden soltar en cualquier parte de la sección (también mientras se suben otras)
  const dropOnSection = {
    onDragOver: (e: React.DragEvent) => {
      if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      if (e.defaultPrevented) return; // ya lo ha recogido la zona de subida
      const files = imageFilesFrom(e.dataTransfer.files);
      if (files.length) {
        e.preventDefault();
        void uploadFiles(files);
      }
    },
  };

  /* ------------------------------ Datos ------------------------------ */

  const [saving, startSaving] = useTransition();
  const [result, setResult] = useState<ObraResult>({});
  const [dirty, setDirty] = useState(false);
  const intentRef = useRef<"save" | "publish" | "unpublish">("save");
  const formRef = useRef<HTMLFormElement>(null);
  const [sector, setSector] = useState(obra.sector ?? "");

  // Aviso al salir con cambios sin guardar, con fotos subiéndose o con un texto de foto a medias
  const leaveGuard = useRef({ dirty, uploading: false });
  leaveGuard.current = { dirty, uploading: upload !== null };
  useEffect(() => {
    const pending = () => leaveGuard.current.dirty || leaveGuard.current.uploading || altPendingRef.current.size > 0;
    const warn = (e: BeforeUnloadEvent) => {
      if (pending()) e.preventDefault();
    };
    // Los enlaces del panel (menú, «Salir»…) cambian de página sin recargar: se pregunta antes
    const onClick = (e: MouseEvent) => {
      if (!pending() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("target") === "_blank") return;
      const message = leaveGuard.current.uploading
        ? "Todavía se están subiendo fotos. Si sales ahora, las que falten no se subirán. ¿Salir igualmente?"
        : "Hay cambios sin guardar. ¿Salir igualmente?";
      if (!confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // «Salir» del menú es un formulario: también se pregunta
    const onSubmitElsewhere = (e: SubmitEvent) => {
      if (!pending() || e.target === formRef.current) return;
      if (!confirm("Hay cambios sin guardar o fotos subiéndose. ¿Salir igualmente?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmitElsewhere, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmitElsewhere, true);
    };
  }, []);

  // Al abrir la ficha: ¿quedó algo sin guardar la última vez?
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(obra.id));
      const draft = raw ? (JSON.parse(raw) as Draft) : null;
      if (draft && draftHasNews(draft, obra)) setPendingDraft(draft);
      else if (raw) localStorage.removeItem(draftKey(obra.id));
    } catch {
      // Sin almacenamiento local (modo privado…): no pasa nada
    }
    // Sólo al montar (la ficha se monta de nuevo al cambiar de obra)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onFormChange() {
    setDirty(true);
    if (!formRef.current) return;
    try {
      // La base es lo guardado al empezar a escribir (si ya había copia, se conserva su base)
      const previous = JSON.parse(localStorage.getItem(draftKey(obra.id)) ?? "null") as Draft | null;
      const draft: Draft = { ...readForm(formRef.current), savedAt: Date.now(), base: previous?.base ?? valuesOf(obra) };
      localStorage.setItem(draftKey(obra.id), JSON.stringify(draft));
    } catch {
      // Sin almacenamiento local: sólo queda el aviso al salir
    }
  }

  function restoreDraft(d: Draft) {
    const form = formRef.current;
    if (!form) return;
    // Sólo lo que se cambió en esa copia; el resto queda como está guardado ahora
    const changed = new Set(changedKeys(d));
    for (const k of DRAFT_FIELDS) {
      const el = form.elements.namedItem(k);
      if (changed.has(k) && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) el.value = d[k];
    }
    if (changed.has("servicios")) {
      form.querySelectorAll<HTMLInputElement>('input[name="servicios"]').forEach((el) => (el.checked = d.servicios.includes(el.value)));
    }
    const destacada = form.elements.namedItem("destacada");
    if (changed.has("destacada") && destacada instanceof HTMLInputElement) destacada.checked = d.destacada;
    if (changed.has("sector")) setSector(d.sector);
    setPendingDraft(null);
    setDirty(true);
    // La copia sigue guardada hasta que se guarde de verdad
  }

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey(obra.id));
    } catch {}
    setPendingDraft(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("intent", intentRef.current);
    intentRef.current = "save";
    startSaving(async () => {
      setResult({});
      try {
        const r = await saveObra(obra.id, formData);
        setResult(r);
        if (!r.error) {
          setDirty(false);
          discardDraft();
        }
      } catch (err) {
        unstable_rethrow(err);
        setResult({ error: actionFailed(err) });
      }
    });
  }

  // Intro en un campo de texto guarda sin cambiar el estado. Sin esto, el navegador «pulsaría»
  // el primer botón del formulario, que en un borrador es «Guardar y publicar»
  function onFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    const t = e.target;
    if (e.key !== "Enter" || e.nativeEvent.isComposing || t instanceof HTMLTextAreaElement || t instanceof HTMLButtonElement) return;
    e.preventDefault();
    intentRef.current = "save";
    formRef.current?.requestSubmit();
  }

  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ready = { photos: fotos.length > 0, sector: Boolean(sector) };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link href="/panel/obras" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-500 hover:text-ink-900">
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
      <section className={`${card} mt-8`} aria-labelledby="fotos-titulo" {...dropOnSection}>
        <header className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
          <span className="grid size-8 place-items-center rounded-lg bg-laser-500 font-display text-lg font-bold text-ink-900">1</span>
          <h2 id="fotos-titulo" className="text-2xl font-bold">
            Fotos
          </h2>
          <p className="text-sm text-ink-500">La primera es la portada. {fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`}</p>
        </header>
        <div className="space-y-5 p-4 sm:p-6">
          {obra.publicada && (
            <p className="rounded-2xl bg-laser-500/15 px-4 py-3 text-sm text-ink-800">
              Esta obra está en la web: las fotos que subas, muevas o borres se ven en la web al momento, sin pulsar «Guardar».
            </p>
          )}
          {upload ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-laser-500 bg-laser-500/10 p-6 text-center" role="status">
              <LoaderCircle className="size-8 animate-spin text-ink-700" />
              <p className="font-bold text-ink-900">
                Subiendo foto {Math.min(upload.done + 1, upload.total)} de {upload.total}…
              </p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-ink-900 transition-all" style={{ width: `${(upload.done / upload.total) * 100}%` }} />
              </div>
              <p className="text-xs text-ink-500">No cierres esta página hasta que termine. Puedes soltar o pegar más fotos: se añaden a la cola.</p>
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
            <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${photoBusy ? "opacity-70" : ""}`}>
              {fotos.map((f, i) => (
                <li key={f.id} data-foto={f.id} className={`flex flex-col gap-2 rounded-2xl border p-2 ${i === 0 ? "border-laser-500 ring-4 ring-laser-500/20" : "border-ink-200"}`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-100">
                    <Image
                      src={galleryImageUrl(f.storage_path)}
                      alt={f.alt || `Foto ${i + 1}`}
                      fill
                      sizes="(min-width: 1024px) 310px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-laser-500 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-ink-900 uppercase">
                        <Star className="size-3 fill-current" /> Portada
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-0.5">
                    <IconButton label="Mover a la izquierda" busy={photosBusy} disabled={i === 0} onClick={() => moveTo(i, i - 1, "Mover a la izquierda")}>
                      <ChevronLeft className="size-5" />
                    </IconButton>
                    <IconButton label="Mover a la derecha" busy={photosBusy} disabled={i === fotos.length - 1} onClick={() => moveTo(i, i + 1, "Mover a la derecha")}>
                      <ChevronRight className="size-5" />
                    </IconButton>
                    {i > 0 && (
                      <button
                        type="button"
                        aria-label="Poner de portada"
                        title="Poner de portada"
                        aria-disabled={photosBusy}
                        onClick={() => !photosBusy && moveTo(i, 0, "Mover a la derecha")}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-ink-600 hover:bg-laser-500/20 hover:text-ink-900 aria-disabled:opacity-40"
                      >
                        <Star className="size-3.5" /> Portada
                      </button>
                    )}
                    <IconButton
                      label="Borrar foto"
                      danger
                      className="ml-auto"
                      busy={photosBusy}
                      onClick={() => {
                        if (obra.publicada && fotos.length === 1) {
                          setPhotoErrors(["Es la única foto de una obra publicada. Sube otra antes o quita la obra de la web."]);
                          return;
                        }
                        if (confirm(`¿Borrar la foto ${i + 1}? No se puede deshacer.`)) runPhoto(() => deleteObraPhoto(f.id), { type: "remove", id: f.id });
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
                    onChange={(e) => {
                      if (e.target.value.trim() !== f.alt) altPendingRef.current.set(f.id, e.target.value.trim());
                      else altPendingRef.current.delete(f.id);
                    }}
                    onBlur={(e) => {
                      const alt = e.target.value.trim();
                      if (alt !== f.alt) void saveAlt(f.id, alt);
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
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onChange={onFormChange}
        onKeyDown={onFormKeyDown}
        className={`${card} mt-6`}
        aria-labelledby="datos-titulo"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-4 sm:px-6">
          <span className="grid size-8 place-items-center rounded-lg bg-laser-500 font-display text-lg font-bold text-ink-900">2</span>
          <h2 id="datos-titulo" className="text-2xl font-bold">
            Datos de la obra
          </h2>
        </header>
        {pendingDraft && (
          <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-laser-500 bg-laser-500/15 p-4 sm:mx-6" role="status">
            <RotateCcw className="size-5 shrink-0 text-ink-800" />
            <p className="min-w-0 flex-1 text-sm text-ink-800">
              <strong>Hay cambios que no se llegaron a guardar</strong> (
              {new Date(pendingDraft.savedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" })}).
            </p>
            <button type="button" onClick={() => restoreDraft(pendingDraft)} className="btn-dark !px-4 !py-2 text-sm">
              Recuperarlos
            </button>
            <button type="button" onClick={discardDraft} className="text-sm font-bold text-ink-600 underline hover:text-ink-900">
              Descartar
            </button>
          </div>
        )}
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
            {dirty && !saving && <span className="rounded-full bg-laser-500/25 px-3 py-1 text-sm font-semibold text-ink-900">Tienes cambios sin guardar</span>}
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
              try {
                const r = await deleteObra(obra.id); // si va bien, vuelve al listado
                if (r?.error) setDeleteError(r.error);
              } catch (err) {
                unstable_rethrow(err);
                setDeleteError(actionFailed(err));
              }
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

/** busy: ocupado un momento (sin `disabled`, para que el foco del teclado no salte al principio) */
function IconButton({
  label,
  disabled,
  busy,
  onClick,
  danger,
  className = "",
  children,
}: {
  label: string;
  disabled?: boolean;
  busy?: boolean;
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
      aria-disabled={busy || undefined}
      onClick={() => !busy && onClick()}
      className={`grid size-9 place-items-center rounded-lg transition-colors disabled:opacity-30 aria-disabled:opacity-50 ${
        danger ? "text-ink-400 hover:bg-red-50 hover:text-red-600" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
      } ${className}`}
    >
      {children}
    </button>
  );
}
