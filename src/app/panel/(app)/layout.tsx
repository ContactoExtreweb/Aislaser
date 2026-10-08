import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { PanelNav } from "@/components/panel/PanelNav";
import { AuthShell } from "@/components/panel/AuthShell";
import { signOut } from "@/app/panel/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAdminSession } from "@/lib/supabase/server";

export default async function PanelAppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) redirect("/panel/login");

  const { supabase, user, isAdmin } = await getAdminSession();
  if (!user) redirect("/panel/login");

  if (!isAdmin) {
    return (
      <AuthShell title="Sin acceso al panel" intro={`El usuario ${user.email} no tiene permiso de administrador.`}>
        <div className="space-y-4">
          <p className="flex gap-3 rounded-2xl bg-ink-100 p-4 text-sm text-ink-700">
            <ShieldAlert className="size-5 shrink-0" /> Para darle acceso, ejecuta el script <code>supabase/add-admin.sql</code> con este email.
          </p>
          <form action={signOut}>
            <button className="btn-dark w-full">Cerrar sesión</button>
          </form>
          <Link href="/" className="block text-center text-sm font-bold underline">
            Volver a la web
          </Link>
        </div>
      </AuthShell>
    );
  }

  const { count } = await supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false);

  return (
    <>
      <PanelNav email={user.email ?? ""} unread={count ?? 0} />
      {children}
    </>
  );
}
