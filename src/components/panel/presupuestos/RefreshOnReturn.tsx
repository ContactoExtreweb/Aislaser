"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { quoteChanges } from "./useQuoteEditor";

/**
 * El editor guarda directamente en la base de datos: al volver al listado (también con «Atrás»,
 * que reutiliza la página guardada) se piden los datos de nuevo si se tocó algún presupuesto.
 */
export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    if (!quoteChanges.pending) return;
    quoteChanges.pending = false;
    // Un momento para que terminen los últimos guardados que se lanzaron al salir del editor
    const timer = setTimeout(() => router.refresh(), 600);
    return () => clearTimeout(timer);
  }, [router]);
  return null;
}
