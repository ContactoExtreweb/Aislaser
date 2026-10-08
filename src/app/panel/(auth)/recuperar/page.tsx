import type { Metadata } from "next";
import { AuthShell } from "@/components/panel/AuthShell";
import { ResetForm } from "@/components/panel/AuthForms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <AuthShell title="Recuperar contraseña" intro="Te enviaremos un enlace a tu email para crear una contraseña nueva.">
      <ResetForm />
    </AuthShell>
  );
}
