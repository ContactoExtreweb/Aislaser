"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Send } from "lucide-react";
import { sendContact, type ContactState } from "@/app/(site)/contacto/actions";
import { services } from "@/content/services";

const initial: ContactState = { status: "idle" };

export function ContactForm({ defaultService = "" }: { defaultService?: string }) {
  const [state, action, pending] = useActionState(sendContact, initial);

  if (state.status === "ok") {
    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-ink-950 p-10 text-center text-white lg:p-16">
        <span className="grid size-20 place-items-center rounded-full bg-laser-500 text-ink-900">
          <CircleCheck className="size-10" />
        </span>
        <h2 className="mt-8 text-4xl font-bold text-white">¡Mensaje enviado!</h2>
        <p className="mt-4 max-w-md text-lg text-ink-300">
          Gracias por contactar con Aislaser. Te responderemos lo antes posible para estudiar tu proyecto.
        </p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const input =
    "mt-2 w-full rounded-2xl border bg-white px-4 py-3.5 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/30";

  return (
    <form action={action} className="rounded-[2rem] border border-ink-200 bg-white p-6 shadow-[0_40px_80px_-50px_rgb(0_0_0/0.35)] sm:p-10" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-ink-800">Nombre *</span>
          <input name="name" autoComplete="name" required className={`${input} ${err.name ? "border-red-500" : "border-ink-200"}`} placeholder="Tu nombre o empresa" />
          {err.name && <span className="mt-1 block text-sm text-red-600">{err.name}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink-800">Teléfono *</span>
          <input name="phone" type="tel" autoComplete="tel" required className={`${input} ${err.phone ? "border-red-500" : "border-ink-200"}`} placeholder="600 000 000" />
          {err.phone && <span className="mt-1 block text-sm text-red-600">{err.phone}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink-800">Email *</span>
          <input name="email" type="email" autoComplete="email" required className={`${input} ${err.email ? "border-red-500" : "border-ink-200"}`} placeholder="tu@email.com" />
          {err.email && <span className="mt-1 block text-sm text-red-600">{err.email}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink-800">¿Qué necesitas?</span>
          <select name="service" defaultValue={defaultService} className={`${input} border-ink-200`}>
            <option value="">Selecciona un servicio</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
            <option value="otro">Otro / no lo sé</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-ink-800">Cuéntanos en qué te podemos ayudar</span>
          <textarea name="message" rows={5} className={`${input} resize-y border-ink-200`} placeholder="Tipo de superficie, metros aproximados, ubicación de la obra, plazos…" />
        </label>
      </div>

      {/* Campo trampa anti-spam */}
      <div className="hidden" aria-hidden="true">
        <label>
          Web <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm text-ink-600">
        <input name="privacy" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-ink-900" />
        <span>
          He leído y acepto el{" "}
          <Link href="/aviso-legal" className="font-bold text-ink-900 underline underline-offset-2">
            aviso legal
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="font-bold text-ink-900 underline underline-offset-2">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      {err.privacy && <span className="mt-1 block text-sm text-red-600">{err.privacy}</span>}

      {state.status === "error" && state.message && (
        <p className="mt-6 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-8 w-full text-base disabled:opacity-60 sm:w-auto">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
