import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cpu, Medal, Users } from "lucide-react";
import { Eyebrow, Mark } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const pillars = [
  {
    icon: Cpu,
    title: "Tecnología",
    text: "Maquinaria de proyección de última generación y los procedimientos más adecuados para cada trabajo.",
  },
  {
    icon: Medal,
    title: "Experiencia",
    text: "Más de 15 años dando soluciones a constructoras, industria, administraciones y particulares.",
  },
  {
    icon: Users,
    title: "Equipo",
    text: "Personal altamente cualificado, formado en obras de gran envergadura y exigencia.",
  },
];

export function Intro() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="container-x grid items-center gap-16 lg:grid-cols-2">
        <Reveal className="relative order-2 lg:order-1">
          <div className="relative aspect-[4/5] w-[78%] overflow-hidden rounded-[2rem] shadow-2xl">
            <Image
              src="/images/site/poliurea-cubierta-verde.webp"
              alt="Cubierta impermeabilizada con poliurea por Aislaser"
              fill
              sizes="(min-width: 1024px) 40vw, 80vw"
              className="object-cover"
            />
          </div>
          <div className="absolute right-0 bottom-[-6%] aspect-square w-[52%] overflow-hidden rounded-[2rem] border-8 border-white shadow-2xl">
            <Image
              src="/images/site/equipo-puente.webp"
              alt="Técnico de Aislaser aplicando poliurea en un puente"
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="absolute top-8 right-[8%] rounded-2xl bg-ink-900 px-5 py-4 text-white shadow-xl">
            <p className="font-display text-4xl leading-none font-bold text-laser-500">+15</p>
            <p className="mt-1 text-xs font-bold tracking-wider text-ink-200 uppercase">años proyectando</p>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow>Bienvenidos a Aislaser</Eyebrow>
            <h2 className="mt-5 text-4xl leading-[1.02] font-bold sm:text-5xl lg:text-6xl">
              Innovar es buscar soluciones a <Mark>nuevas exigencias</Mark>
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-600">
              <p>
                Somos expertos en <strong className="text-ink-900">impermeabilización de cubiertas técnicas</strong> y estamos a
                la vanguardia de las aplicaciones con <strong className="text-ink-900">poliureas y poliuretanos</strong>.
              </p>
              <p>
                Ofrecemos una solución integral incorporando las últimas innovaciones en I+D del sector, con un equipo de
                profesionales de alta cualificación y una amplísima experiencia en obras de gran envergadura.
              </p>
            </div>
            <Link href="/empresa" className="btn-dark mt-10">
              Conoce la empresa <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </div>

      <div className="container-x mt-24 grid gap-5 md:grid-cols-3 lg:mt-32">
        {pillars.map((p, i) => (
          <Reveal
            key={p.title}
            delay={i * 120}
            className="group relative overflow-hidden rounded-3xl border border-ink-200 bg-ink-50 p-8 transition-colors duration-500 hover:border-ink-900 hover:bg-ink-900"
          >
            <span className="absolute top-6 right-7 font-display text-6xl font-bold text-ink-200 transition-colors group-hover:text-white/10">
              0{i + 1}
            </span>
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-ink-900 shadow-sm transition-colors group-hover:bg-laser-500">
              <p.icon className="size-6" strokeWidth={1.6} />
            </span>
            <h3 className="mt-8 text-3xl font-bold transition-colors group-hover:text-white">{p.title}</h3>
            <p className="mt-3 leading-relaxed text-ink-600 transition-colors group-hover:text-ink-300">{p.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
