import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="bg-grid-dark relative grid min-h-[100svh] place-items-center bg-ink-950 px-6 text-center text-white">
      <div>
        <Link href="/" aria-label="Aislaser, inicio">
          <Logo variant="white" className="mx-auto h-10 w-auto" />
        </Link>
        <p className="mt-16 font-display text-[9rem] leading-none font-bold text-laser-500">404</p>
        <h1 className="mt-4 text-4xl font-bold text-white">Esta página no existe</h1>
        <p className="mt-4 text-ink-300">Puede que la dirección haya cambiado con la nueva web.</p>
        <Link href="/" className="btn-primary mt-10">
          <ArrowLeft className="size-4" /> Volver al inicio
        </Link>
      </div>
    </main>
  );
}
