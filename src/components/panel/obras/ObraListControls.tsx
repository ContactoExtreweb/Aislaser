"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Plus } from "lucide-react";
import { createObra, moveObra, type ObraResult } from "@/app/panel/obras-actions";

/** «Nueva obra»: sólo pide el nombre; lo demás se rellena en su ficha */
export function NewObraForm() {
  const [state, action, pending] = useActionState<ObraResult, FormData>(createObra, {});
  return (
    <form action={action} className="w-full sm:w-auto">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="titulo"
          required
          maxLength={160}
          placeholder="Nombre de la obra (p. ej. Piscina de Mérida)"
          className="min-w-0 rounded-full border border-ink-200 bg-white px-5 py-3 outline-none focus:border-ink-900 focus:ring-4 focus:ring-laser-500/25 sm:w-80"
        />
        <button type="submit" disabled={pending} className="btn-primary shrink-0 text-base">
          {pending ? <LoaderCircle className="size-5 animate-spin" /> : <Plus className="size-5" strokeWidth={2.5} />} Nueva obra
        </button>
      </div>
      {state.error && (
        <p className="mt-2 text-sm font-semibold text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Flechas para cambiar el orden en que salen las obras en la web */
export function MoveObraButtons({ id, title, first, last }: { id: string; title: string; first: boolean; last: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const move = (direction: -1 | 1) =>
    start(async () => {
      setError(null);
      const result = await moveObra(id, direction);
      if (result.error) setError(result.error);
    });
  return (
    <div className="flex items-center gap-1">
      {pending && <LoaderCircle className="size-4 animate-spin text-ink-400" />}
      <button
        type="button"
        disabled={pending || first}
        onClick={() => move(-1)}
        className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
        title="Subir (sale antes en la web)"
        aria-label={`Subir ${title}`}
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        disabled={pending || last}
        onClick={() => move(1)}
        className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
        title="Bajar (sale después en la web)"
        aria-label={`Bajar ${title}`}
      >
        <ArrowDown className="size-4" />
      </button>
      {error && (
        <p className="max-w-[200px] text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
