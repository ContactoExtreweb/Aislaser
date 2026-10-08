import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/panel/AuthForms";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default function NuevaContrasenaPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl font-bold">Contraseña nueva</h1>
      <p className="mt-2 text-ink-500">Elige una contraseña de al menos 8 caracteres.</p>
      <div className="mt-8">
        <NewPasswordForm />
      </div>
    </main>
  );
}
