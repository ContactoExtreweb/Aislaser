import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/panel/AuthShell";
import { LoginForm } from "@/components/panel/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/panel/login">) {
  const { next, error } = await searchParams;
  if (!isSupabaseConfigured) {
    return (
      <AuthShell title="Panel aún sin conectar" intro="Falta configurar la base de datos (Supabase) en las variables de entorno.">
        <Link href="/panel/demo" className="btn-primary w-full text-base">
          Probar el editor en modo demostración
        </Link>
      </AuthShell>
    );
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/panel");

  return (
    <AuthShell title="Entrar al panel" intro="Accede para crear y descargar tus dosieres.">
      <LoginForm next={typeof next === "string" ? next : undefined} linkError={error === "enlace"} />
    </AuthShell>
  );
}
