import { Factory, HardHat, House, Landmark, Plane, Waves } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const audiences = [
  {
    icon: Factory,
    title: "Industria y energía",
    text: "Cubiertas de naves, bodegas, almacenes y centrales que no pueden permitirse una filtración.",
    examples: "Central Nuclear de Almaraz · Central Térmica de Algeciras",
  },
  {
    icon: Plane,
    title: "Infraestructuras",
    text: "Aeropuertos, puentes, ferrocarril y obra hidráulica con los máximos requisitos técnicos.",
    examples: "Aeropuertos de Bilbao, Málaga y Sevilla · AVE",
  },
  {
    icon: Landmark,
    title: "Administraciones públicas",
    text: "Hospitales, edificios oficiales, recintos feriales e instalaciones deportivas.",
    examples: "Hospital de Huelva · Palacio de Congresos de Villanueva",
  },
  {
    icon: HardHat,
    title: "Constructoras e ingenierías",
    text: "Subcontrata especializada en obra nueva y rehabilitación, con equipo y maquinaria propios.",
    examples: "Obra nueva · Rehabilitación · Parkings",
  },
  {
    icon: Waves,
    title: "Piscinas y depósitos",
    text: "Vasos de piscina, balsas y depósitos que necesitan una estanqueidad absoluta.",
    examples: "Piscinas de Córdoba, Camas y Los Santos",
  },
  {
    icon: House,
    title: "Comunidades y particulares",
    text: "Terrazas, cubiertas y viviendas con filtraciones o humedades que hay que resolver de raíz.",
    examples: "Viviendas · Terrazas · Comunidades de vecinos",
  },
];

export function Audience() {
  return (
    <section className="bg-grid-light relative bg-ink-50 py-24 lg:py-32">
      <div className="container-x">
        <SectionHeading
          eyebrow="A quién nos dirigimos"
          title="De la gran infraestructura a la terraza de tu casa"
          intro="Trabajamos con las principales empresas del sector y con cualquier cliente que necesite una impermeabilización hecha para durar."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a, i) => (
            <Reveal
              key={a.title}
              delay={(i % 3) * 100}
              className="group flex flex-col rounded-[2rem] border border-ink-200 bg-white p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgb(0_0_0/0.35)]"
            >
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-laser-500 text-ink-900 transition-transform duration-500 group-hover:rotate-[-6deg]">
                  <a.icon className="size-6" strokeWidth={1.6} />
                </span>
                <h3 className="text-2xl leading-tight font-bold">{a.title}</h3>
              </div>
              <p className="mt-5 mb-6 leading-relaxed text-ink-600">{a.text}</p>
              <p className="mt-auto border-t border-ink-100 pt-5 text-xs font-bold tracking-wide text-ink-400 uppercase">
                {a.examples}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
