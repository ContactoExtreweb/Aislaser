import { Check } from "lucide-react";
import { VideoEmbed } from "@/components/site/VideoEmbed";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { company } from "@/content/company";

export function VideoSection() {
  return (
    <section className="bg-ink-50 py-24 lg:py-32">
      <div className="container-x grid items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow="En acción"
            title="Mira cómo trabajamos"
            intro="Con más de 15 años de experiencia, nuestros sistemas de impermeabilización con poliurea cumplen los mejores requisitos técnicos y suponen una auténtica revolución estética."
          />
          <Reveal as="ul" className="mt-8 space-y-3">
            {["Maquinaria de proyección de última generación", "Equipos propios y personal cualificado", "Obras en toda España"].map((t) => (
              <li key={t} className="flex items-center gap-3 font-semibold text-ink-800">
                <span className="grid size-6 place-items-center rounded-full bg-laser-500">
                  <Check className="size-3.5 text-ink-900" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </Reveal>
        </div>
        <Reveal className="lg:col-span-7">
          <VideoEmbed id={company.youtubeId} title="Aislaser: impermeabilización con poliurea" poster="/images/site/poliurea-edificio.webp" />
        </Reveal>
      </div>
    </section>
  );
}
