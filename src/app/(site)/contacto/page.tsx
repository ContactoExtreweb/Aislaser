import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/site/ContactForm";
import { PageHero } from "@/components/site/PageHero";
import { company } from "@/content/company";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta con Aislaser sin compromiso: 609 005 163 · 619 987 792 · aislaser@aislaser.es. Pol. Ind. Campanario, Nave 2 y 3, Campanario (Badajoz).",
  alternates: { canonical: "/contacto" },
};

export default async function ContactoPage({ searchParams }: PageProps<"/contacto">) {
  const { servicio } = await searchParams;
  const defaultService = typeof servicio === "string" && services.some((s) => s.slug === servicio) ? servicio : "";
  const bbox = [company.geo.lng - 0.03, company.geo.lat - 0.015, company.geo.lng + 0.03, company.geo.lat + 0.015].join(",");

  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Hablemos de tu proyecto"
        intro="Contacta con nosotros sin compromiso y te asesoraremos sobre las mejores soluciones para tu obra."
        image="/images/site/poliurea-cubierta-verde.webp"
        crumbs={[{ label: "Contacto" }]}
      />

      <section className="py-20 lg:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            {company.phones.map((p, i) => (
              <a key={p.href} href={p.href} className="group flex items-center gap-5 rounded-3xl border border-ink-200 p-6 transition-colors hover:border-ink-900">
                <span className="grid size-14 place-items-center rounded-2xl bg-laser-500 text-ink-900">
                  <Phone className="size-6" />
                </span>
                <span>
                  <span className="block text-xs font-bold tracking-widest text-ink-400 uppercase">Teléfono {i + 1}</span>
                  <span className="font-display text-3xl font-bold text-ink-900">{p.label}</span>
                </span>
              </a>
            ))}
            <a href={`mailto:${company.email}`} className="flex items-center gap-5 rounded-3xl border border-ink-200 p-6 transition-colors hover:border-ink-900">
              <span className="grid size-14 place-items-center rounded-2xl bg-ink-900 text-laser-500">
                <Mail className="size-6" />
              </span>
              <span>
                <span className="block text-xs font-bold tracking-widest text-ink-400 uppercase">Email</span>
                <span className="font-bold text-ink-900">{company.email}</span>
              </span>
            </a>
            <a href={company.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 rounded-3xl border border-ink-200 p-6 transition-colors hover:border-ink-900">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink-900 text-laser-500">
                <MapPin className="size-6" />
              </span>
              <span>
                <span className="block text-xs font-bold tracking-widest text-ink-400 uppercase">Dirección</span>
                <span className="font-bold text-ink-900">{company.address.street}</span>
                <span className="block text-sm text-ink-600">
                  {company.address.postalCode} {company.address.city} ({company.address.province})
                </span>
              </span>
            </a>
            <div className="flex items-center gap-5 rounded-3xl bg-ink-50 p-6">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-ink-900">
                <Clock className="size-6" />
              </span>
              <p className="text-sm text-ink-600">
                Trabajamos en <strong className="text-ink-900">toda España</strong>. Te respondemos lo antes posible para estudiar tu
                caso.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <ContactForm defaultService={defaultService} />
          </div>
        </div>
      </section>

      <section className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="relative h-[420px] overflow-hidden rounded-[2.5rem] bg-ink-100">
          <iframe
            title="Mapa de situación de Aislaser en Campanario (Badajoz)"
            className="absolute inset-0 size-full grayscale-[0.6]"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${company.geo.lat},${company.geo.lng}`}
          />
          <a
            href={company.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-dark absolute bottom-6 left-6 shadow-xl"
          >
            <MapPin className="size-4 text-laser-500" /> Cómo llegar
          </a>
        </div>
      </section>
    </>
  );
}
