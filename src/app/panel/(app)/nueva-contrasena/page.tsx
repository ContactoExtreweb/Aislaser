import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NewPasswordForm } from "@/components/panel/AuthForms";
import { RECOVERY_COOKIE } from "@/lib/auth-constants";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function NuevaContrasenaPage() {
  const supabase = await getSupabaseServer();
  const [{ data }, cookieStore] = await Promise.all([supabase.auth.getUser(), cookies()]);
  const fromRecovery = Boolean(data.user && cookieStore.get(RECOVERY_COOKIE)?.value === data.user.id);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl font-bold">Contraseña nueva</h1>
      <p className="mt-2 text-ink-500">
        Elige una contraseña de al menos 8 caracteres{fromRecovery ? "." : " y confirma la actual."}
      </p>
      <div className="mt-8">
        <NewPasswordForm fromRecovery={fromRecovery} />
      </div>
    </main>
  );
}
