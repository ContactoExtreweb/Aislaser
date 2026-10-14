"use client";

import { useState, useTransition } from "react";
import { Copy, FileSpreadsheet, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { createQuote, createQuoteFromMessage, deleteQuote, duplicateQuote, type QuoteResult } from "@/app/panel/presupuestos-actions";

/** Ejecuta una acción del servidor y guarda su error (si redirige, la página cambia sola) */
function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<QuoteResult>) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
    });
  return { pending, error, run };
}

function ErrorText({ error, className = "" }: { error: string | null; className?: string }) {
  if (!error) return null;
  return (
    <p className={`text-xs font-semibold text-red-600 ${className}`} role="alert">
      {error}
    </p>
  );
}

export function NewQuoteButton() {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={() => run(createQuote)} disabled={pending} className="btn-primary text-base disabled:opacity-60">
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <Plus className="size-5" strokeWidth={2.5} />} Nuevo presupuesto
      </button>
      <ErrorText error={error} className="max-w-xs text-right" />
    </div>
  );
}

export function QuoteFromMessageButton({ messageId }: { messageId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => run(() => createQuoteFromMessage(messageId))}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-xl bg-laser-500 px-3 py-2 text-sm font-bold text-ink-900 hover:bg-laser-400 disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Hacer presupuesto
      </button>
      <ErrorText error={error} className="max-w-[240px]" />
    </div>
  );
}

export function QuoteActions({ id, label }: { id: string; label: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {pending && <LoaderCircle className="size-4 animate-spin text-ink-400" />}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => duplicateQuote(id))}
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
            if (confirm(`¿Eliminar ${label} y todas sus partidas? No se puede deshacer.`)) run(() => deleteQuote(id));
          }}
          className="grid size-9 place-items-center rounded-xl text-ink-400 hover:bg-red-50 hover:text-red-600"
          title="Eliminar"
          aria-label={`Eliminar ${label}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <ErrorText error={error} className="max-w-[220px] text-right" />
    </div>
  );
}
