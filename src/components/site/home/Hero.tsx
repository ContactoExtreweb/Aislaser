import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { company } from "@/content/company";
import { getProject } from "@/content/projects";

const stats = [
  { value: company.yearsExperience, label: "años de experiencia" },
  { value: "+30", label: "obras de referencia" },
  { value: "6", label: "especialidades técnicas" },
  { value: "0", label: "mantenimiento con poliurea" },
];

export function Hero() {
  const highlight = getProject("aeropuerto-de-sevilla-t1")!;
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink-950 text-white">
      <Image
        src="/images/site/hero-poliurea-cubierta.webp"
        alt="Operarios de Aislaser proyectando poliurea sobre una cubierta"
        fill
        preload
        sizes="100vw"
        className="-z-20 scale-105 object-cover object-[70%_center] opacity-70"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/50" />
      <div className="bg-grid-dark absolute inset-0 -z-10 [mask-image:linear-gradient(to_right,black,transparent_70%)]" />

      <div className="container-x flex flex-1 flex-col justify-center pt-32 pb-12 lg:pt-36">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 py-1.5 pr-4 pl-2 text-xs font-bold tracking-wide text-ink-200 backdrop-blur">
            <span className="grid size-6 place-items-center rounded-full bg-laser-500">
              <span className="size-2 animate-pulse-dot rounded-full bg-ink-900" />
            </span>
            Poliurea · Poliuretano · Aislamientos
          </div>

          <h1 className="mt-7 text-[2.9rem] leading-[0.95] font-bold text-white sm:text-7xl lg:text-[5.6rem]">
            Impermeabilización técnica con <span className="text-laser-500">poliurea</span> y poliuretano
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-200 sm:text-xl">
            Recubrimientos de última generación para cubiertas, piscinas, naves y grandes infraestructuras. Aeropuertos,
            centrales energéticas, hospitales y viviendas de toda España confían su estanqueidad a nuestro equipo.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/contacto" className="btn-primary text-base">
              Pide presupuesto sin compromiso <ArrowRight className="size-4" />
            </Link>
            <Link href="/obras" className="btn-ghost-light text-base">
              Ver obras realizadas
            </Link>
          </div>
        </div>

        <Link
          href={`/obras/${highlight.slug}`}
          className="group absolute right-8 bottom-44 hidden w-72 animate-float overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl xl:block"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image
              src={highlight.images[0].src}
              alt={highlight.title}
              fill
              sizes="288px"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-laser-500 uppercase">Obra destacada</p>
              <p className="mt-1 font-display text-xl font-bold">{highlight.title}</p>
            </div>
            <ArrowUpRight className="size-5 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      </div>

      <div className="relative border-t border-white/10 bg-ink-950/60 backdrop-blur-md">
        <div className="container-x grid grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`py-6 lg:py-8 ${i % 2 ? "pl-6" : ""} ${i > 0 ? "lg:border-l lg:border-white/10 lg:pl-8" : ""} ${
                i < 2 ? "border-b border-white/10 lg:border-b-0" : ""
              }`}
            >
              <p className="font-display text-4xl font-bold text-white lg:text-5xl">{s.value}</p>
              <p className="mt-1 text-sm text-ink-300">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
