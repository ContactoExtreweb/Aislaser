import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function AuthShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <Image src="/images/site/hero-poliurea-cubierta.webp" alt="" fill priority sizes="50vw" className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/60" />
        <div className="bg-grid-dark absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/" aria-label="Ir a la web">
            <Logo variant="white" className="h-10 w-auto" />
          </Link>
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-laser-500 uppercase">Área privada</p>
            <p className="mt-4 max-w-md font-display text-5xl leading-[1] font-bold">Crea dosieres de obra en minutos</p>
            <p className="mt-4 max-w-md text-ink-300">Escribe cada punto, arrastra sus fotos y descárgalo en PDF o imágenes con la imagen de Aislaser.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Ir a la web" className="lg:hidden">
            <Logo className="h-9 w-auto" />
          </Link>
          <h1 className="mt-10 text-4xl font-bold lg:mt-0">{title}</h1>
          {intro && <p className="mt-3 text-ink-500">{intro}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

export const authInput =
  "mt-1.5 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3.5 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900 focus:ring-4 focus:ring-laser-500/30";
