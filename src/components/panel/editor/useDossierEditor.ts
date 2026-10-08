"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prepareImage } from "@/lib/dossier/image";
import type { Dossier, DossierFields, DossierImage, DossierPoint, DossierRepo, PointFields } from "@/lib/dossier/types";

export type PendingUpload = { id: string; preview: string; error?: string };
export type SaveState = { pending: number; failed: number; error: string | null };

type Task = () => Promise<void>;

const TEXT_DELAY = 700;
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000];

/**
 * Última versión conocida de cada dosier en esta pestaña. Al volver con el botón
 * «Atrás» del navegador, Next reutiliza la página cacheada con los datos antiguos:
 * sin esto, la siguiente edición machacaría lo que ya se había guardado.
 */
const latestById = new Map<string, { dossier: Dossier; at: number }>();

function initialState(initial: Dossier) {
  const cached = latestById.get(initial.id);
  // Si el servidor tiene algo más reciente (editado en otro dispositivo), manda el servidor
  if (cached && Date.parse(initial.updated_at) <= cached.at) return cached.dossier;
  return initial;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useDossierEditor(initial: Dossier, repo: DossierRepo) {
  const [dossier, setDossier] = useState<Dossier>(() => initialState(initial));
  const [uploads, setUploads] = useState<Record<string, PendingUpload[]>>({});
  const [running, setRunning] = useState(0);
  const [scheduled, setScheduled] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Fuente de verdad síncrona (el estado de React sólo la refleja para pintar)
  const dossierRef = useRef(dossier);
  const apply = useCallback((fn: (d: Dossier) => Dossier) => {
    dossierRef.current = fn(dossierRef.current);
    latestById.set(dossierRef.current.id, { dossier: dossierRef.current, at: Date.now() });
    setDossier(dossierRef.current);
  }, []);

  /* ------------------------- Motor de guardado ------------------------- */

  // Guardados diferidos (texto): se agrupan para no enviar una petición por tecla
  const timers = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>());
  // Guardados fallidos pendientes de reintento (clave → última versión de la tarea)
  const failed = useRef(new Map<string, Task>());
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);

  const syncCounters = useCallback(() => {
    setScheduled(timers.current.size);
    setFailedCount(failed.current.size);
    if (failed.current.size === 0) {
      setLastError(null);
      retryAttempt.current = 0;
    }
  }, []);

  // Por clave: los guardados se encadenan en orden y uno nuevo deja obsoletos a los anteriores
  const versions = useRef(new Map<string, number>());
  const chains = useRef(new Map<string, Promise<boolean>>());

  /** Ejecuta un guardado con clave; si falla se reintenta solo con espera creciente */
  const runKeyed = useCallback(
    (key: string, task: Task): Promise<boolean> => {
      const version = (versions.current.get(key) ?? 0) + 1;
      versions.current.set(key, version);
      const previous = chains.current.get(key) ?? Promise.resolve(true);
      const next = previous.then(async () => {
        // Ya hay una versión más reciente de este guardado: ésta sobra
        if (versions.current.get(key) !== version) return true;
        setRunning((n) => n + 1);
        try {
          await task();
          if (versions.current.get(key) === version) failed.current.delete(key);
          return true;
        } catch (e) {
          if (versions.current.get(key) === version) {
            failed.current.set(key, task);
            setLastError(errorText(e));
            scheduleRetry();
          }
          return false;
        } finally {
          setRunning((n) => n - 1);
          syncCounters();
        }
      });
      chains.current.set(key, next);
      return next;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncCounters],
  );

  const retryAll = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
    const tasks = [...failed.current.entries()];
    if (!tasks.length) {
      retryAttempt.current = 0;
      return;
    }
    retryAttempt.current += 1;
    tasks.forEach(([key, task]) => void runKeyed(key, task));
  }, [runKeyed]);

  function scheduleRetry() {
    if (retryTimer.current) return;
    const delay = RETRY_DELAYS[Math.min(retryAttempt.current, RETRY_DELAYS.length - 1)];
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      retryAll();
    }, delay);
  }

  /** Acciones puntuales (crear, subir, borrar): sin reintento automático, devuelven si salió bien */
  const attempt = useCallback(async <T,>(task: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> => {
    setRunning((n) => n + 1);
    try {
      return { ok: true, value: await task() };
    } catch (e) {
      setLastError(errorText(e));
      return { ok: false };
    } finally {
      setRunning((n) => n - 1);
    }
  }, []);

  const debounce = useCallback(
    (key: string, task: Task, delay = TEXT_DELAY) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing.timer);
      // La nueva tarea lleva el valor más reciente: sustituye a un reintento pendiente
      failed.current.delete(key);
      const run = () => {
        timers.current.delete(key);
        syncCounters();
        void runKeyed(key, task);
      };
      timers.current.set(key, { timer: setTimeout(run, delay), run });
      syncCounters();
    },
    [runKeyed, syncCounters],
  );

  const flush = useCallback(() => {
    timers.current.forEach(({ timer, run }) => {
      clearTimeout(timer);
      run();
    });
  }, []);

  const busyRef = useRef(false);
  busyRef.current = running > 0 || scheduled > 0 || failedCount > 0;

  // Guardar al salir, al cambiar de app en el móvil y avisar si queda algo sin guardar
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onOnline = () => retryAll();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timers.current.size > 0 || busyRef.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flush, retryAll]);

  useEffect(
    () => () => {
      flush();
      if (retryTimer.current) clearTimeout(retryTimer.current);
      // Al salir del editor, un último intento con lo que había fallado
      failed.current.forEach((task) => void task().catch(() => undefined));
    },
    [flush],
  );

  const mapPoint = useCallback(
    (id: string, fn: (p: DossierPoint) => DossierPoint) =>
      apply((d) => ({ ...d, points: d.points.map((p) => (p.id === id ? fn(p) : p)) })),
    [apply],
  );

  /* ---------------------------- Datos generales ---------------------------- */

  const setField = useCallback(
    <K extends keyof DossierFields>(field: K, value: DossierFields[K]) => {
      apply((d) => ({ ...d, [field]: value }));
      debounce(`dossier.${field}`, () => repo.updateDossier(dossierRef.current.id, { [field]: value }));
    },
    [apply, debounce, repo],
  );

  const setCover = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setUploads((u) => ({ ...u, cover: [{ id: "cover", preview }] }));
      const result = await attempt(async () => {
        const { blob, width, height } = await prepareImage(file);
        return repo.setCover(dossierRef.current, blob, { width, height });
      });
      setUploads((u) => ({ ...u, cover: [] }));
      URL.revokeObjectURL(preview);
      if (result.ok) apply((d) => ({ ...d, cover_image_path: result.value.path, cover_url: result.value.url }));
    },
    [apply, attempt, repo],
  );

  const removeCover = useCallback(async () => {
    const before = dossierRef.current;
    apply((d) => ({ ...d, cover_image_path: null, cover_url: null }));
    const result = await attempt(() => repo.removeCover(before));
    if (!result.ok) apply((d) => ({ ...d, cover_image_path: before.cover_image_path, cover_url: before.cover_url }));
  }, [apply, attempt, repo]);

  /* --------------------------------- Puntos -------------------------------- */

  /** Fija el orden en pantalla y guarda TODAS las posiciones (un reintento posterior lo deja todo coherente) */
  const commitPoints = useCallback(
    (points: DossierPoint[]) => {
      const ordered = points.map((p, i) => ({ ...p, position: i }));
      apply((d) => ({ ...d, points: ordered }));
      const items = ordered.map((p) => ({ id: p.id, position: p.position }));
      if (items.length) void runKeyed("order.points", () => repo.reorderPoints(items));
    },
    [apply, repo, runKeyed],
  );

  const addPoint = useCallback(
    async (index?: number) => {
      const d = dossierRef.current;
      const at = index ?? d.points.length;
      const created = await attempt(() => repo.addPoint(d.id, at));
      if (!created.ok) return null;
      const points = [...dossierRef.current.points];
      points.splice(at, 0, created.value);
      commitPoints(points);
      return created.value.id;
    },
    [attempt, commitPoints, repo],
  );

  const updatePoint = useCallback(
    (id: string, patch: Partial<PointFields>, immediate = false) => {
      mapPoint(id, (p) => ({ ...p, ...patch }));
      Object.entries(patch).forEach(([field, value]) => {
        const key = `point.${id}.${field}`;
        const task = () => repo.updatePoint(id, { [field]: value });
        if (immediate) {
          failed.current.delete(key);
          void runKeyed(key, task);
        } else debounce(key, task);
      });
    },
    [debounce, mapPoint, repo, runKeyed],
  );

  const deletePoint = useCallback(
    async (id: string) => {
      const point = dossierRef.current.points.find((p) => p.id === id);
      if (!point) return false;
      const result = await attempt(() => repo.deletePoint(point));
      if (!result.ok) return false;
      // Sólo si se borró de verdad: descartar sus guardados pendientes y renumerar
      const prefix = `point.${id}.`;
      [...timers.current.keys(), ...failed.current.keys(), ...versions.current.keys()]
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => {
          const t = timers.current.get(key);
          if (t) clearTimeout(t.timer);
          timers.current.delete(key);
          failed.current.delete(key);
          versions.current.set(key, (versions.current.get(key) ?? 0) + 1);
        });
      syncCounters();
      commitPoints(dossierRef.current.points.filter((p) => p.id !== id));
      return true;
    },
    [attempt, commitPoints, repo, syncCounters],
  );

  const movePoint = useCallback(
    (id: string, dir: -1 | 1) => {
      const points = [...dossierRef.current.points];
      const i = points.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= points.length) return;
      [points[i], points[j]] = [points[j], points[i]];
      commitPoints(points);
    },
    [commitPoints],
  );

  /* -------------------------------- Imágenes ------------------------------- */

  const persistImageOrder = useCallback(
    (pointId: string, images: DossierImage[]) => {
      const items = images.map((img, i) => ({ id: img.id, position: i }));
      if (items.length) void runKeyed(`order.images.${pointId}`, () => repo.reorderImages(items));
    },
    [repo, runKeyed],
  );

  // Una cola por apartado: dos tandas de fotos seguidas no se pisan las posiciones
  const uploadQueues = useRef(new Map<string, Promise<void>>());

  const uploadImages = useCallback(
    (pointId: string, files: File[]) => {
      if (!files.length) return Promise.resolve();
      const items = files.map((file) => ({ file, id: crypto.randomUUID(), preview: URL.createObjectURL(file) }));
      setUploads((u) => ({ ...u, [pointId]: [...(u[pointId] ?? []), ...items.map(({ id, preview }) => ({ id, preview }))] }));

      const processBatch = async () => {
        for (const item of items) {
          const point = dossierRef.current.points.find((p) => p.id === pointId);
          if (!point) break;
          const created = await attempt(async () => {
            const { blob, width, height } = await prepareImage(item.file);
            const fresh = dossierRef.current.points.find((p) => p.id === pointId) ?? point;
            return repo.addImage(fresh, blob, { width, height }, fresh.images.length);
          });
          setUploads((u) => ({
            ...u,
            [pointId]: created.ok
              ? (u[pointId] ?? []).filter((x) => x.id !== item.id)
              : (u[pointId] ?? []).map((x) => (x.id === item.id ? { ...x, error: "No se pudo subir" } : x)),
          }));
          if (created.ok) {
            URL.revokeObjectURL(item.preview);
            mapPoint(pointId, (p) => ({ ...p, images: [...p.images, created.value] }));
          }
        }
      };
      const next = (uploadQueues.current.get(pointId) ?? Promise.resolve()).then(processBatch, processBatch);
      uploadQueues.current.set(pointId, next);
      return next;
    },
    [attempt, mapPoint, repo],
  );

  const dismissUpload = useCallback((pointId: string, uploadId: string) => {
    setUploads((u) => ({ ...u, [pointId]: (u[pointId] ?? []).filter((x) => x.id !== uploadId) }));
  }, []);

  const updateCaption = useCallback(
    (pointId: string, imageId: string, caption: string) => {
      mapPoint(pointId, (p) => ({ ...p, images: p.images.map((i) => (i.id === imageId ? { ...i, caption } : i)) }));
      debounce(`image.${imageId}.caption`, () => repo.updateImage(imageId, { caption }));
    },
    [debounce, mapPoint, repo],
  );

  const deleteImage = useCallback(
    async (pointId: string, image: DossierImage) => {
      const point = dossierRef.current.points.find((p) => p.id === pointId);
      if (!point) return;
      const before = point.images;
      const remaining = before.filter((i) => i.id !== image.id).map((i, idx) => ({ ...i, position: idx }));
      mapPoint(pointId, (p) => ({ ...p, images: remaining }));
      const result = await attempt(() => repo.deleteImage(image));
      if (!result.ok) {
        // No se borró: vuelve a aparecer donde estaba
        mapPoint(pointId, (p) => ({ ...p, images: before }));
        return;
      }
      const captionKey = `image.${image.id}.caption`;
      const pendingCaption = timers.current.get(captionKey);
      if (pendingCaption) clearTimeout(pendingCaption.timer);
      timers.current.delete(captionKey);
      failed.current.delete(captionKey);
      versions.current.set(captionKey, (versions.current.get(captionKey) ?? 0) + 1);
      syncCounters();
      persistImageOrder(pointId, remaining);
    },
    [attempt, mapPoint, persistImageOrder, repo, syncCounters],
  );

  const moveImage = useCallback(
    (pointId: string, from: number, to: number) => {
      const point = dossierRef.current.points.find((p) => p.id === pointId);
      if (!point || from === to || to < 0 || to >= point.images.length) return;
      const images = [...point.images];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      const ordered = images.map((img, i) => ({ ...img, position: i }));
      mapPoint(pointId, (p) => ({ ...p, images: ordered }));
      persistImageOrder(pointId, ordered);
    },
    [mapPoint, persistImageOrder],
  );

  const save: SaveState = { pending: running + scheduled, failed: failedCount, error: lastError };

  return {
    dossier,
    uploads,
    save,
    flush,
    retryAll,
    setField,
    setCover,
    removeCover,
    addPoint,
    updatePoint,
    deletePoint,
    movePoint,
    uploadImages,
    dismissUpload,
    updateCaption,
    deleteImage,
    moveImage,
  };
}

export type DossierEditorApi = ReturnType<typeof useDossierEditor>;
