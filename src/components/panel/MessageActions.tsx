"use client";

import { useTransition } from "react";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { deleteMessage, setMessageRead } from "@/app/panel/actions";

export function MessageActions({ id, isRead }: { id: string; isRead: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex gap-1 ${pending ? "opacity-50" : ""}`}>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setMessageRead(id, !isRead))}
        className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-xs font-bold text-ink-700 hover:border-ink-900"
      >
        {isRead ? <Mail className="size-3.5" /> : <MailOpen className="size-3.5" />}
        {isRead ? "Marcar como no leído" : "Marcar como leído"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("¿Eliminar este mensaje?")) start(() => deleteMessage(id));
        }}
        className="grid size-9 place-items-center rounded-xl text-ink-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Eliminar mensaje"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
