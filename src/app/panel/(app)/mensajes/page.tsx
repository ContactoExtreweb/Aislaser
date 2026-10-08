import type { Metadata } from "next";
import { Inbox, Mail, Phone } from "lucide-react";
import { MessageActions } from "@/components/panel/MessageActions";
import { services } from "@/content/services";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mensajes" };

type Message = {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default async function MensajesPage() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  const messages = (data ?? []) as Message[];
  const serviceName = (slug: string) => services.find((s) => s.slug === slug)?.name ?? (slug === "otro" ? "Otro" : slug);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-extrabold tracking-[0.22em] text-ink-400 uppercase">Formulario de la web</p>
      <h1 className="mt-2 text-5xl font-bold">Mensajes</h1>

      {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error: {error.message}</p>}

      {messages.length === 0 && !error ? (
        <div className="mt-10 flex flex-col items-center rounded-[2rem] border-2 border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <Inbox className="size-10 text-ink-400" />
          <p className="mt-4 font-display text-2xl font-bold">No hay mensajes todavía</p>
          <p className="mt-1 text-ink-500">Aquí aparecerán las solicitudes enviadas desde la página de contacto.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-[1.5rem] border bg-white p-6 ${m.is_read ? "border-ink-200" : "border-laser-500 ring-4 ring-laser-500/15"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-display text-2xl font-bold text-ink-900">
                    {!m.is_read && <span className="size-2.5 rounded-full bg-laser-500" aria-label="No leído" />}
                    {m.name}
                  </p>
                  <p className="text-xs font-semibold text-ink-400">
                    {new Date(m.created_at).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" })}
                    {m.service && ` · ${serviceName(m.service)}`}
                  </p>
                </div>
                <MessageActions id={m.id} isRead={m.is_read} />
              </div>
              {m.message && <p className="mt-4 whitespace-pre-line text-ink-700">{m.message}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-bold text-white">
                  <Phone className="size-4 text-laser-500" /> {m.phone}
                </a>
                <a href={`mailto:${m.email}`} className="flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-bold text-ink-800 hover:border-ink-900">
                  <Mail className="size-4" /> {m.email}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
