"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prepareImage } from "@/lib/dossier/image";
import type { Dossier, DossierFields, DossierImage, DossierPoint, DossierRepo, PointFields } from "@/lib/dossier/types";

export type PendingUpload = { id: string; preview: string; error?: string };
export type SaveState = { pending: number; error: string | null; savedAt: number | null };

const TEXT_DELAY = 700;

export function useDossierEditor(initial: Dossier, repo: DossierRepo) {
  const [dossier, setDossier] = useState<Dossier>(initial);
  const [uploads, setUploads] = useState<Record<string, PendingUpload[]>>({});
  const [save, setSave] = useState<SaveState>({ pending: 0, error: null, savedAt: null });

  // Guardados diferidos (texto): se agrupan para no enviar una petición por tecla
  const timers = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>());
  const [scheduled, setScheduled] = useState(0);
  // Fuente de verdad síncrona (el estado de React sólo la refleja para pintar)
  const dossierRef = useRef(dossier);
  const apply = useCallback((fn: (d: Dossier) => Dossier) => {
    dossierRef.current = fn(dossierRef.current);
    setDossier(dossierRef.current);
  }, []);

  const track = useCallback(async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    setSave((s) => ({ ...s, pending: s.pending + 1 }));
    try {
      const result = await task();
      setSave((s) => ({ pending: s.pending - 1, error: null, savedAt: Date.now() }));
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setSave((s) => ({ ...s, pending: s.pending - 1, error: message }));
      return undefined;
    }
  }, []);

  const debounce = useCallback(
    (key: string, task: () => Promise<void>, delay = TEXT_DELAY) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing.timer);
      const run = () => {
        timers.current.delete(key);
        setScheduled(timers.current.size);
        void track(task);
      };
      timers.current.set(key, { timer: setTimeout(run, delay), run });
      setScheduled(timers.current.size);
    },
    [track],
  );

  const flush = useCallback(() => {
    timers.current.forEach(({ timer, run }) => {
      clearTimeout(timer);
      run();
    });
  }, []);

  // Al salir de la página, enviar lo pendiente y avisar si aún se está guardando
  useEffect(() => {
    const onHide = () => flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timers.current.size > 0 || save.pending > 0) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flush, save.pending]);

  useEffect(() => () => flush(), [flush]);

  const mapPoint = (id: string, fn: (p: DossierPoint) => DossierPoint) =>
    apply((d) => ({ ...d, points: d.points.map((p) => (p.id === id ? fn(p) : p)) }));

  /* ---------------------------- Datos generales ---------------------------- */

  const setField = useCallback(
    <K extends keyof DossierFields>(field: K, value: DossierFields[K]) => {
      apply((d) => ({ ...d, [field]: value }));
      debounce(`dossier.${field}`, () => repo.updateDossier(dossierRef.current.id, { [field]: value }));
    },
    [debounce, repo],
  );

  const setCover = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setUploads((u) => ({ ...u, cover: [{ id: "cover", preview }] }));
      const result = await track(async () => {
        const { blob, width, height } = await prepareImage(file);
        return repo.setCover(dossierRef.current, blob, { width, height });
      });
      setUploads((u) => ({ ...u, cover: [] }));
      if (result) apply((d) => ({ ...d, cover_image_path: result.path, cover_url: result.url }));
    },
    [repo, track],
  );

  const removeCover = useCallback(async () => {
    const current = dossierRef.current;
    apply((d) => ({ ...d, cover_image_path: null, cover_url: null }));
    await track(() => repo.removeCover(current));
  }, [repo, track]);

  /* --------------------------------- Puntos -------------------------------- */

  /** Recalcula posiciones, guarda las que han cambiado y actualiza el estado */
  const commitPoints = useCallback(
    (points: DossierPoint[]) => {
      const changed = points
        .map((p, i) => ({ id: p.id, position: i, old: p.position }))
        .filter((p) => p.position !== p.old)
        .map(({ id, position }) => ({ id, position }));
      if (changed.length) void track(() => repo.reorderPoints(changed));
      apply((d) => ({ ...d, points: points.map((p, i) => ({ ...p, position: i })) }));
    },
    [repo, track],
  );

  const addPoint = useCallback(
    async (index?: number) => {
      const d = dossierRef.current;
      const at = index ?? d.points.length;
      const created = await track(() => repo.addPoint(d.id, at));
      if (!created) return null;
      const points = [...dossierRef.current.points];
      points.splice(at, 0, created);
      // El nuevo ya se creó con su posición; el resto se desplaza
      commitPoints(points.map((p) => (p.id === created.id ? { ...p, position: at } : p)));
      return created.id;
    },
    [commitPoints, repo, track],
  );

  const updatePoint = useCallback(
    (id: string, patch: Partial<PointFields>, immediate = false) => {
      mapPoint(id, (p) => ({ ...p, ...patch }));
      if (immediate) void track(() => repo.updatePoint(id, patch));
      else
        Object.entries(patch).forEach(([field, value]) =>
          debounce(`point.${id}.${field}`, () => repo.updatePoint(id, { [field]: value })),
        );
    },
    [debounce, repo, track],
  );

  const deletePoint = useCallback(
    async (id: string) => {
      const point = dossierRef.current.points.find((p) => p.id === id);
      if (!point) return;
      timers.current.forEach((t, key) => {
        if (key.startsWith(`point.${id}.`)) {
          clearTimeout(t.timer);
          timers.current.delete(key);
        }
      });
      setScheduled(timers.current.size);
      await track(() => repo.deletePoint(point));
      commitPoints(dossierRef.current.points.filter((p) => p.id !== id));
    },
    [commitPoints, repo, track],
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

  const uploadImages = useCallback(
    async (pointId: string, files: File[]) => {
      if (!files.length) return;
      const items = files.map((file) => ({ file, id: crypto.randomUUID(), preview: URL.createObjectURL(file) }));
      setUploads((u) => ({ ...u, [pointId]: [...(u[pointId] ?? []), ...items.map(({ id, preview }) => ({ id, preview }))] }));

      // De una en una para respetar el orden y no saturar conexiones móviles
      for (const item of items) {
        const point = dossierRef.current.points.find((p) => p.id === pointId);
        if (!point) break;
        const created = await track(async () => {
          const { blob, width, height } = await prepareImage(item.file);
          return repo.addImage(point, blob, { width, height }, point.images.length);
        });
        setUploads((u) => ({
          ...u,
          [pointId]: created
            ? (u[pointId] ?? []).filter((x) => x.id !== item.id)
            : (u[pointId] ?? []).map((x) => (x.id === item.id ? { ...x, error: "No se pudo subir" } : x)),
        }));
        if (created) {
          URL.revokeObjectURL(item.preview);
          mapPoint(pointId, (p) => ({ ...p, images: [...p.images, created] }));
        }
      }
    },
    [repo, track],
  );

  const dismissUpload = useCallback((pointId: string, uploadId: string) => {
    setUploads((u) => ({ ...u, [pointId]: (u[pointId] ?? []).filter((x) => x.id !== uploadId) }));
  }, []);

  const updateCaption = useCallback(
    (pointId: string, imageId: string, caption: string) => {
      mapPoint(pointId, (p) => ({ ...p, images: p.images.map((i) => (i.id === imageId ? { ...i, caption } : i)) }));
      debounce(`image.${imageId}.caption`, () => repo.updateImage(imageId, { caption }));
    },
    [debounce, repo],
  );

  const deleteImage = useCallback(
    async (pointId: string, image: DossierImage) => {
      const point = dossierRef.current.points.find((p) => p.id === pointId);
      if (!point) return;
      const remaining = point.images.filter((i) => i.id !== image.id).map((i, idx) => ({ ...i, position: idx }));
      const changed = remaining
        .filter((i) => point.images.find((o) => o.id === i.id)?.position !== i.position)
        .map((i) => ({ id: i.id, position: i.position }));
      mapPoint(pointId, (p) => ({ ...p, images: remaining }));
      await track(async () => {
        await repo.deleteImage(image);
        if (changed.length) await repo.reorderImages(changed);
      });
    },
    [repo, track],
  );

  const moveImage = useCallback(
    (pointId: string, from: number, to: number) => {
      const point = dossierRef.current.points.find((p) => p.id === pointId);
      if (!point || from === to || to < 0 || to >= point.images.length) return;
      const images = [...point.images];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      const changed = images
        .map((img, i) => ({ id: img.id, position: i, old: img.position }))
        .filter((x) => x.position !== x.old)
        .map(({ id, position }) => ({ id, position }));
      mapPoint(pointId, (p) => ({ ...p, images: images.map((img, i) => ({ ...img, position: i })) }));
      if (changed.length) void track(() => repo.reorderImages(changed));
    },
    [repo, track],
  );

  return {
    dossier,
    uploads,
    save: { ...save, pending: save.pending + scheduled },
    flush,
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
