"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

/** Error amigable dentro del panel (en lugar de la pantalla genérica de Next) */
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
        <TriangleAlert className="size-8" />
      </span>
      <h1 className="mt-6 text-4xl font-bold">Algo no ha ido bien</h1>
      <p className="mt-3 text-ink-600">
        {error.message && !error.digest ? error.message : "No se ha podido completar la acción. Comprueba la conexión e inténtalo de nuevo."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          <RotateCcw className="size-4" /> Reintentar
        </button>
        <Link href="/panel" className="btn-ghost-dark">
          Volver a mis informes
        </Link>
      </div>
    </main>
  );
}
