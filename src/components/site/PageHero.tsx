import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/SectionHeading";

type Crumb = { href?: string; label: string };

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  crumbs = [],
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  image: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 pt-36 pb-20 text-white lg:pt-44 lg:pb-28">
      <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/80 to-transparent" />
      <div className="bg-grid-dark absolute inset-0 -z-10 [mask-image:linear-gradient(to_right,black,transparent_75%)]" />

      <div className="container-x">
        <nav aria-label="Ruta de navegación" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
            <li>
              <Link href="/" className="hover:text-white">
                Inicio
              </Link>
            </li>
            {crumbs.map((c) => (
              <li key={c.label} className="flex items-center gap-1.5">
                <ChevronRight className="size-3.5" />
                {c.href ? (
                  <Link href={c.href} className="hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-ink-200" aria-current="page">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-3xl">
          <Eyebrow tone="dark">{eyebrow}</Eyebrow>
          <h1 className="mt-5 text-5xl leading-[0.98] font-bold text-white sm:text-6xl lg:text-7xl">{title}</h1>
          {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-200 sm:text-xl">{intro}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
