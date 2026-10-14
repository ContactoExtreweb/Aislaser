"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Motor de guardado automático del editor de presupuestos (mismo comportamiento que el de los
 * dosieres): agrupa lo que se escribe, encadena los guardados de cada campo en orden, reintenta
 * solo con espera creciente si falla y guarda lo pendiente al salir o cambiar de app.
 */

export type SaveState = { pending: number; failed: number; error: string | null };
type Task = () => Promise<void>;

const TEXT_DELAY = 700;
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000];
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useSaveQueue() {
  const [running, setRunning] = useState(0);
  const [scheduled, setScheduled] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const timers = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>());
  const failed = useRef(new Map<string, Task>());
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const versions = useRef(new Map<string, number>());
  const chains = useRef(new Map<string, Promise<boolean>>());

  const syncCounters = useCallback(() => {
    setScheduled(timers.current.size);
    setFailedCount(failed.current.size);
    if (failed.current.size === 0) {
      setLastError(null);
      retryAttempt.current = 0;
    }
  }, []);

  const retryAllRef = useRef<() => void>(() => undefined);
  const scheduleRetry = useCallback(() => {
    if (retryTimer.current) return;
    const delay = RETRY_DELAYS[Math.min(retryAttempt.current, RETRY_DELAYS.length - 1)];
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      retryAllRef.current();
    }, delay);
  }, []);

  /** Guardado con clave: uno nuevo deja obsoletos a los anteriores de la misma clave */
  const runKeyed = useCallback(
    (key: string, task: Task): Promise<boolean> => {
      const version = (versions.current.get(key) ?? 0) + 1;
      versions.current.set(key, version);
      const previous = chains.current.get(key) ?? Promise.resolve(true);
      const next = previous.then(async () => {
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
    [scheduleRetry, syncCounters],
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
  retryAllRef.current = retryAll;

  /** Acciones puntuales (crear, borrar): sin reintento automático, devuelven si salió bien */
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

  /** Olvida lo pendiente de unas claves (p. ej. de una partida que se acaba de borrar) */
  const cancel = useCallback(
    (prefix: string) => {
      timers.current.forEach(({ timer }, key) => {
        if (!key.startsWith(prefix)) return;
        clearTimeout(timer);
        timers.current.delete(key);
      });
      [...failed.current.keys()].filter((k) => k.startsWith(prefix)).forEach((k) => failed.current.delete(k));
      // Un guardado ya en marcha de esas claves queda obsoleto
      [...versions.current.keys()].filter((k) => k.startsWith(prefix)).forEach((k) => versions.current.set(k, (versions.current.get(k) ?? 0) + 1));
      syncCounters();
    },
    [syncCounters],
  );

  const flush = useCallback(() => {
    timers.current.forEach(({ timer, run }) => {
      clearTimeout(timer);
      run();
    });
  }, []);

  const busyRef = useRef(false);
  busyRef.current = running > 0 || scheduled > 0 || failedCount > 0;

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

  useEffect(() => {
    const failedTasks = failed.current;
    const retry = retryTimer;
    return () => {
      flush();
      if (retry.current) clearTimeout(retry.current);
      // Al salir del editor, un último intento con lo que había fallado
      failedTasks.forEach((task) => void task().catch(() => undefined));
    };
  }, [flush]);

  const save: SaveState = { pending: running + scheduled, failed: failedCount, error: lastError };
  return { save, runKeyed, debounce, attempt, cancel, flush, retryAll };
}
