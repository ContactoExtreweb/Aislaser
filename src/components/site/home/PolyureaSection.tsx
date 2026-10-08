import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Layers, Palette, ShieldCheck, Shapes, Thermometer, Timer, Magnet } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const properties = [
  { icon: Timer, title: "Secado ultrarrápido", text: "Cura en segundos: la superficie vuelve a estar operativa en tiempo récord." },
  { icon: Shapes, title: "Se adapta a todo", text: "Recubre cualquier forma irregular existente, sin juntas ni solapes." },
  { icon: Magnet, title: "Máxima adherencia", text: "Sobre metal, madera, hormigón, aluminio, fibra de vidrio o cemento." },
  { icon: ShieldCheck, title: "Estanqueidad total", text: "Membrana continua e impermeable, con protección contra la corrosión." },
  { icon: Thermometer, title: "Clima extremo", text: "Alta resistencia a temperaturas extremas y a los cambios climáticos." },
  { icon: Palette, title: "Acabado a medida", text: "Antideslizante y en diferentes colores, con un resultado estético impecable." },
  { icon: Layers, title: "Pavimento resistente", text: "Ideal para parkings, naves e instalaciones con tránsito intenso." },
  { icon: BadgeCheck, title: "Sin mantenimiento", text: "Y lo más importante: la poliurea no requiere mantenimiento." },
];

export function PolyureaSection() {
  return (
    <section className="relative overflow-hidden bg-ink-950 py-24 text-white lg:py-32">
      <div className="bg-grid-dark absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-laser-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative container-x">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <SectionHeading
              tone="dark"
              eyebrow="Por qué poliurea"
              title={
                <>
                  La revolución de la <span className="text-laser-500">impermeabilización</span>
                </>
              }
              intro="Nuestros sistemas de poliurea no sólo cumplen los requisitos técnicos más exigentes: también aportan un acabado estético propio de los mejores proyectos."
            />
            <Reveal className="relative mt-10 aspect-[4/3] overflow-hidden rounded-[2rem]">
              <Image
                src="/images/obras/conibridge-cordoba/01.webp"
                alt="Proyección de poliurea sobre el tablero de un puente"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-ink-950/70 px-5 py-4 backdrop-blur-md">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-laser-500 uppercase">Aplicación</p>
                  <p className="font-display text-xl font-bold">Proyección en caliente</p>
                </div>
                <Link href="/servicios/poliurea" className="grid size-11 place-items-center rounded-full bg-laser-500 text-ink-900">
                  <ArrowRight className="size-5" />
                  <span className="sr-only">Saber más sobre la poliurea</span>
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="grid gap-px self-end overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:col-span-7">
            {properties.map((p, i) => (
              <Reveal key={p.title} delay={(i % 2) * 90} className="group bg-ink-950 p-7 transition-colors duration-500 hover:bg-ink-900">
                <p.icon className="size-7 text-laser-500 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
                <h3 className="mt-5 text-2xl font-bold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
