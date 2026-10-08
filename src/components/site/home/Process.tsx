import { ClipboardCheck, FileText, Search, SprayCan } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  {
    icon: Search,
    title: "Visita técnica y diagnóstico",
    text: "Estudiamos la cubierta o el soporte, localizamos el origen de filtraciones y humedades y tomamos medidas.",
  },
  {
    icon: FileText,
    title: "Propuesta a medida",
    text: "Te recomendamos el sistema más adecuado (poliurea, poliuretano o aislamiento) con un presupuesto claro y sin compromiso.",
  },
  {
    icon: SprayCan,
    title: "Preparación y aplicación",
    text: "Preparamos el soporte (limpieza, chorreado, reparaciones) y proyectamos el sistema con maquinaria de última generación.",
  },
  {
    icon: ClipboardCheck,
    title: "Control y entrega",
    text: "Revisamos espesores, remates y puntos singulares, y entregamos la obra limpia y documentada con su dosier.",
  },
];

export function Process() {
  return (
    <section className="py-24 lg:py-32">
      <div className="container-x">
        <SectionHeading
          align="center"
          eyebrow="Cómo trabajamos"
          title="Un proceso claro, de la primera visita a la entrega"
          intro="Cada obra es distinta, pero nuestro método es siempre el mismo: rigor técnico, plazos cumplidos y comunicación directa."
        />

        <ol className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden="true" className="absolute top-10 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-ink-300 to-transparent lg:block" />
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 120} className="group relative text-center">
              <div className="relative mx-auto grid size-20 place-items-center rounded-full border border-ink-200 bg-white shadow-[0_15px_40px_-20px_rgb(0_0_0/0.3)] transition-all duration-500 group-hover:border-laser-500 group-hover:bg-laser-500">
                <s.icon className="size-8 text-ink-900" strokeWidth={1.5} />
                <span className="absolute -top-1 -right-1 grid size-8 place-items-center rounded-full bg-ink-900 font-display text-sm font-bold text-laser-500">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-7 text-2xl font-bold">{s.title}</h3>
              <p className="mx-auto mt-3 max-w-xs leading-relaxed text-ink-600">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
