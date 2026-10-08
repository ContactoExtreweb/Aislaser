import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { Process } from "@/components/site/home/Process";
import { Reveal } from "@/components/ui/Reveal";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Impermeabilización con poliurea y poliuretano proyectado, aislamientos térmicos y acústicos, taladro y corte de hormigón, refuerzo de estructuras y chorreado de arena.",
  alternates: { canonical: "/servicios" },
};

export default function ServiciosPage() {
  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Todo lo que tu obra necesita para quedar protegida"
        intro="Impermeabilización, aislamiento y trabajos técnicos en hormigón con equipos propios y materiales de primer nivel."
        image="/images/site/banner-cubierta.webp"
        crumbs={[{ label: "Servicios" }]}
      />

      <section className="py-24 lg:py-32">
        <div className="container-x space-y-6">
          {services.map((s, i) => (
            <Reveal key={s.slug}>
              <Link
                href={`/servicios/${s.slug}`}
                className="group grid overflow-hidden rounded-[2rem] border border-ink-200 bg-white transition-all duration-500 hover:border-ink-900 hover:shadow-[0_40px_80px_-40px_rgb(0_0_0/0.35)] md:grid-cols-12"
              >
                <div className={`relative min-h-[260px] md:col-span-5 ${i % 2 ? "md:order-2" : ""}`}>
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    sizes="(min-width: 768px) 40vw, 100vw"
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <span className="absolute top-5 left-5 font-display text-6xl font-bold text-white drop-shadow-lg">0{i + 1}</span>
                </div>
                <div className="flex flex-col p-8 md:col-span-7 lg:p-12">
                  <div className="flex items-start justify-between gap-6">
                    <span className="grid size-14 place-items-center rounded-2xl bg-ink-900 text-laser-500">
                      <ServiceIcon name={s.icon} className="size-7" />
                    </span>
                    <span className="grid size-12 place-items-center rounded-full border border-ink-200 transition-all duration-500 group-hover:border-laser-500 group-hover:bg-laser-500">
                      <ArrowUpRight className="size-5" />
                    </span>
                  </div>
                  <h2 className="mt-8 text-3xl font-bold sm:text-4xl">{s.title}</h2>
                  <p className="mt-3 text-lg text-ink-600">{s.summary}</p>
                  <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                    {s.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-ink-700">
                        <Check className="mt-0.5 size-4 shrink-0 text-laser-600" strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="container-x">
          <div className="flex flex-col gap-5 rounded-[2rem] border border-ink-200 bg-ink-50 p-7 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[0.22em] text-ink-500 uppercase">Y además</p>
              <p className="mt-2 font-display text-3xl font-bold text-ink-900">Otros trabajos que realizamos</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {["Suelos industriales", "Techos desmontables", "Pladur", "Insonorizaciones"].map((t) => (
                <li key={t} className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="bg-ink-50">
        <Process />
      </div>
      <div className="h-5" />
      <CtaBand />
    </>
  );
}
