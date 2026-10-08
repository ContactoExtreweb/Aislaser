"use client";

import { useTransition } from "react";
import { Copy, LoaderCircle, Trash2 } from "lucide-react";
import { deleteDossier, duplicateDossier } from "@/app/panel/actions";

export function DossierActions({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      {pending && <LoaderCircle className="size-4 animate-spin text-ink-400" />}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => duplicateDossier(id))}
        className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        title="Duplicar (usar como plantilla)"
        aria-label={`Duplicar ${title}`}
      >
        <Copy className="size-4" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`¿Eliminar el dosier "${title}" y todas sus fotos? No se puede deshacer.`)) start(() => deleteDossier(id));
        }}
        className="grid size-9 place-items-center rounded-xl text-ink-400 hover:bg-red-50 hover:text-red-600"
        title="Eliminar"
        aria-label={`Eliminar ${title}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
