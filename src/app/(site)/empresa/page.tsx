import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, Cpu, Lightbulb, MapPin, Medal, Users } from "lucide-react";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { Audience } from "@/components/site/home/Audience";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow, Mark, SectionHeading } from "@/components/ui/SectionHeading";
import { company } from "@/content/company";

export const metadata: Metadata = {
  title: "Empresa",
  description:
    "Aislaser es una empresa especializada en recubrimientos de última generación de poliureas y poliuretanos, con más de 15 años de experiencia y sede en Campanario (Badajoz).",
  alternates: { canonical: "/empresa" },
};

const principles = [
  {
    icon: Lightbulb,
    title: "Innovación",
    text: "Incorporamos las últimas innovaciones en I+D realizadas por instituciones y empresas de todo el mundo.",
  },
  {
    icon: Medal,
    title: "Experiencia",
    text: "Más de 15 años ejecutando obras de gran envergadura y exigencia para las principales empresas del sector.",
  },
  {
    icon: Users,
    title: "Equipo",
    text: "Profesionales con una alta cualificación, maquinaria propia y los procedimientos más adecuados para cada trabajo.",
  },
];

export default function EmpresaPage() {
  return (
    <>
      <PageHero
        eyebrow="Quiénes somos"
        title={
          <>
            Especialistas en <span className="text-laser-500">poliureas</span>
          </>
        }
        intro="Más de 15 años de experiencia y una referencia nacional en aplicaciones con poliureas y poliuretanos."
        image="/images/site/banner-aeropuerto.webp"
        crumbs={[{ label: "Empresa" }]}
      />

      <section className="py-24 lg:py-32">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow>Qué hacemos</Eyebrow>
              <h2 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-5xl">
                Recubrimientos de <Mark>última generación</Mark> para obras exigentes
              </h2>
              <div className="prose-aislaser mt-8">
                <p>
                  <strong className="text-ink-900">Aislaser</strong> es una empresa especializada en recubrimientos de última
                  generación de poliureas y poliuretanos. Contamos con un equipo de profesionales con una alta cualificación y
                  una amplísima experiencia lograda en la ejecución de obras de gran envergadura y exigencia.
                </p>
                <p>
                  Entre nuestros clientes se encuentran las principales empresas del sector, lo que nos ha permitido ser una de
                  las empresas más destacadas de España en el campo de la proyección.
                </p>
                <p>
                  Nuestros sistemas de impermeabilización no sólo cumplen con los requerimientos más elevados a nivel técnico:
                  también abren perspectivas estéticas absolutamente novedosas a proyectistas y propietarios de edificios
                  singulares.
                </p>
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal className="relative">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem]">
                <Image
                  src="/images/site/poliuretano-fachada.webp"
                  alt="Palacio de Congresos de Villanueva de la Serena, obra de Aislaser"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -left-4 max-w-[260px] rounded-3xl bg-ink-900 p-6 text-white shadow-2xl sm:-left-10">
                <MapPin className="size-6 text-laser-500" />
                <p className="mt-3 font-display text-2xl font-bold">Desde Extremadura a toda España</p>
                <p className="mt-2 text-sm text-ink-300">
                  Sede en {company.address.city} ({company.address.province})
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink-950 py-24 text-white lg:py-32">
        <div className="bg-grid-dark absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative container-x">
          <SectionHeading
            tone="dark"
            align="center"
            eyebrow="Nuestros principios"
            title="Innovación, experiencia y equipo"
            intro="Tres principios básicos que aparecen reflejados en cada uno de nuestros servicios."
          />
          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 120} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-9">
                <span className="grid size-16 place-items-center rounded-2xl bg-laser-500 text-ink-900">
                  <p.icon className="size-7" strokeWidth={1.6} />
                </span>
                <h3 className="mt-8 text-3xl font-bold text-white">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-300">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2">
          <Reveal className="grid grid-cols-2 gap-4">
            <div className="relative aspect-square overflow-hidden rounded-[1.5rem]">
              <Image src="/images/site/aislamiento-cubierta.webp" alt="Aislamiento de cubierta metálica" fill sizes="25vw" className="object-cover" />
            </div>
            <div className="relative mt-10 aspect-square overflow-hidden rounded-[1.5rem]">
              <Image src="/images/site/taladro-perforacion.webp" alt="Perforación de hormigón" fill sizes="25vw" className="object-cover" />
            </div>
            <div className="relative -mt-10 aspect-square overflow-hidden rounded-[1.5rem]">
              <Image src="/images/site/poliurea-edificio.webp" alt="Cubierta impermeabilizada con poliurea" fill sizes="25vw" className="object-cover" />
            </div>
            <div className="grid aspect-square place-items-center rounded-[1.5rem] bg-laser-500 p-6 text-center text-ink-900">
              <div>
                <Award className="mx-auto size-10" strokeWidth={1.5} />
                <p className="mt-3 font-display text-5xl font-bold">+15</p>
                <p className="text-sm font-bold">años de experiencia</p>
              </div>
            </div>
          </Reveal>
          <div>
            <SectionHeading
              eyebrow="Cómo lo hacemos"
              title="Maquinaria avanzada y procedimientos a medida"
              intro="Disponemos de la maquinaria más avanzada y de los procedimientos más adecuados para cada trabajo, y colaboramos con los principales fabricantes de materiales de impermeabilización y aislamiento."
            />
            <Reveal as="ul" className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Cpu, t: "Equipos de proyección propios" },
                { icon: Award, t: "Materiales de primer nivel" },
                { icon: Users, t: "Personal altamente cualificado" },
                { icon: MapPin, t: "Obras en toda España" },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-center gap-3 rounded-2xl border border-ink-200 p-4 font-bold text-ink-800">
                  <Icon className="size-5 shrink-0 text-ink-900" /> {t}
                </li>
              ))}
            </Reveal>
            <Link href="/servicios" className="btn-dark mt-10">
              Ver servicios <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <Audience />
      <div className="h-5" />
      <CtaBand />
    </>
  );
}
