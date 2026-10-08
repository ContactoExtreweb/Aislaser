"use client";

import { useState, useTransition } from "react";
import { Copy, LoaderCircle, Trash2 } from "lucide-react";
import { deleteDossier, duplicateDossier } from "@/app/panel/actions";

export function DossierActions({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = title || "este informe";

  const run = (action: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {pending && <LoaderCircle className="size-4 animate-spin text-ink-400" />}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => duplicateDossier(id))}
          className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          title="Duplicar (usar como plantilla)"
          aria-label={`Duplicar ${label}`}
        >
          <Copy className="size-4" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Eliminar «${label}» y todas sus fotos? No se puede deshacer.`)) run(() => deleteDossier(id));
          }}
          className="grid size-9 place-items-center rounded-xl text-ink-400 hover:bg-red-50 hover:text-red-600"
          title="Eliminar"
          aria-label={`Eliminar ${label}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {error && (
        <p className="max-w-[220px] text-right text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
