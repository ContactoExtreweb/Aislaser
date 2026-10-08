"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { requestPasswordReset, signIn, updatePassword, type FormState } from "@/app/panel/actions";
import { authInput } from "./AuthShell";

function Feedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">
        <CircleAlert className="mt-0.5 size-4 shrink-0" /> {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
        <CircleCheck className="mt-0.5 size-4 shrink-0" /> {state.ok}
      </p>
    );
  return null;
}

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(signIn, linkError ? { error: "El enlace ha caducado o no es válido. Pide uno nuevo." } : {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? "/panel"} />
      <label className="block">
        <span className="text-sm font-bold text-ink-800">Email</span>
        <input name="email" defaultValue={state.email} type="email" autoComplete="email" required className={authInput} placeholder="tu@email.com" />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-ink-800">Contraseña</span>
        <input name="password" type="password" autoComplete="current-password" required className={authInput} placeholder="••••••••" />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full text-base disabled:opacity-60">
        {pending && <LoaderCircle className="size-4 animate-spin" />} Entrar
      </button>
      <p className="text-center text-sm text-ink-500">
        <Link href="/panel/recuperar" className="font-bold text-ink-900 underline underline-offset-2">
          ¿Has olvidado tu contraseña?
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-bold text-ink-800">Email</span>
        <input name="email" type="email" autoComplete="email" required className={authInput} placeholder="tu@email.com" />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full text-base disabled:opacity-60">
        {pending && <LoaderCircle className="size-4 animate-spin" />} Enviar enlace
      </button>
      <p className="text-center text-sm">
        <Link href="/panel/login" className="font-bold text-ink-900 underline underline-offset-2">
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {});
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-bold text-ink-800">Contraseña nueva</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={authInput} />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-ink-800">Repite la contraseña</span>
        <input name="repeat" type="password" autoComplete="new-password" minLength={8} required className={authInput} />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full text-base disabled:opacity-60">
        {pending && <LoaderCircle className="size-4 animate-spin" />} Guardar contraseña
      </button>
    </form>
  );
}
