import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { services } from "@/content/services";

export function ServicesBento() {
  const [main, ...rest] = services;
  return (
    <section className="bg-ink-50 py-24 lg:py-32">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Qué hacemos"
            title="Soluciones integrales de impermeabilización y aislamiento"
            intro="Desde la preparación del soporte hasta el acabado final: dominamos cada fase para que tu cubierta, piscina o estructura quede protegida durante años."
          />
          <Link href="/servicios" className="btn-ghost-dark shrink-0 self-start lg:self-auto">
            Todos los servicios <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="mt-14 grid auto-rows-[minmax(260px,auto)] gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Reveal className="md:col-span-2 lg:row-span-2">
            <Link
              href={`/servicios/${main.slug}`}
              className="group relative flex h-full min-h-[420px] flex-col justify-end overflow-hidden rounded-[2rem] bg-ink-900 p-8 text-white sm:p-10"
            >
              <Image
                src={main.image}
                alt={main.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
              <span className="relative mb-auto self-start rounded-full bg-laser-500 px-4 py-1.5 text-xs font-extrabold tracking-wider text-ink-900 uppercase">
                Especialidad principal
              </span>
              <div className="relative pt-16">
                <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-laser-500 backdrop-blur">
                  <ServiceIcon name={main.icon} className="size-7" />
                </span>
                <h3 className="mt-6 text-4xl font-bold text-white sm:text-5xl">{main.title}</h3>
                <p className="mt-4 max-w-lg text-lg text-ink-200">{main.summary}</p>
                <span className="mt-8 inline-flex items-center gap-2 font-bold text-laser-500">
                  Descubrir la poliurea
                  <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </div>
            </Link>
          </Reveal>

          {rest.map((s, i) => (
            <Reveal key={s.slug} delay={(i % 2) * 100} className={i === 4 ? "md:col-span-2 lg:col-span-2" : ""}>
              <Link
                href={`/servicios/${s.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-ink-200 bg-white p-7 transition-all duration-500 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                  <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                  <div className="absolute inset-0 bg-ink-950/75" />
                </div>
                <div className="relative flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-ink-900 text-laser-500 transition-colors group-hover:bg-laser-500 group-hover:text-ink-900">
                    <ServiceIcon name={s.icon} className="size-6" />
                  </span>
                  <ArrowUpRight className="size-5 text-ink-400 transition-all group-hover:text-white" />
                </div>
                <div className="relative mt-auto pt-10">
                  <h3 className="text-2xl font-bold transition-colors group-hover:text-white">{s.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500 transition-colors group-hover:text-ink-200">{s.summary}</p>
                </div>
              </Link>
            </Reveal>
          ))}

          <Reveal delay={100} className="md:col-span-2">
            <Link
              href="/contacto"
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] bg-laser-500 p-8 text-ink-900 transition-transform duration-500 hover:-translate-y-1"
            >
              <span className="absolute -right-10 -bottom-16 font-display text-[12rem] leading-none font-bold text-ink-900/[0.07]">?</span>
              <p className="text-xs font-extrabold tracking-[0.22em] uppercase">Asesoramiento técnico</p>
              <div className="relative mt-10">
                <h3 className="text-3xl font-bold sm:text-4xl">¿No sabes qué sistema necesitas?</h3>
                <p className="mt-3 max-w-md font-medium text-ink-800">
                  Cuéntanos tu caso y te recomendamos la solución más adecuada para tu proyecto, sin compromiso.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 font-extrabold">
                  Hablar con un técnico
                  <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
