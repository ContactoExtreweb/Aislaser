import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Phone } from "lucide-react";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { ProjectCard } from "@/components/site/ProjectCard";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow, SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { baseOpenGraph, company } from "@/content/company";
import { getService, services } from "@/content/services";
import { getProjects } from "@/lib/obras";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/servicios/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  const title = service.seo?.title ?? service.title;
  return {
    title,
    description: service.seo?.description ?? `${service.summary} ${service.intro[0]}`.slice(0, 300),
    alternates: { canonical: `/servicios/${service.slug}` },
    openGraph: { ...baseOpenGraph, title, images: [{ url: service.image }] },
  };
}

export default async function ServicePage({ params }: PageProps<"/servicios/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  // En el orden del panel (las flechas de «Obras web» deciden también este orden)
  const related = (await getProjects()).filter((p) => p.services?.includes(service.slug));
  const others = services.filter((s) => s.slug !== service.slug);

  return (
    <>
      <PageHero
        eyebrow="Servicio"
        title={service.title}
        intro={service.summary}
        image={service.image}
        crumbs={[{ href: "/servicios", label: "Servicios" }, { label: service.name }]}
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href={`/contacto?servicio=${service.slug}`} className="btn-primary text-base">
            Pedir presupuesto <ArrowRight className="size-4" />
          </Link>
          <a href={company.phones[0].href} className="btn-ghost-light text-base">
            <Phone className="size-4" /> {company.phones[0].label}
          </a>
        </div>
      </PageHero>

      <section className="py-24 lg:py-32">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="grid size-16 place-items-center rounded-2xl bg-ink-900 text-laser-500">
                <ServiceIcon name={service.icon} className="size-8" />
              </span>
              <div className="prose-aislaser mt-10">
                {service.intro.map((p) => (
                  <p key={p.slice(0, 20)}>{p}</p>
                ))}
              </div>
            </Reveal>

            <Reveal className="mt-14">
              <Eyebrow>Dónde se aplica</Eyebrow>
              <ul className="mt-6 flex flex-wrap gap-2">
                {service.applications.map((a) => (
                  <li key={a} className="rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-sm font-bold text-ink-800">
                    {a}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <aside className="lg:col-span-5">
            <Reveal className="sticky top-28 rounded-[2rem] bg-ink-950 p-8 text-white lg:p-10">
              <Eyebrow tone="dark">Ventajas</Eyebrow>
              <ul className="mt-6 space-y-4">
                {service.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-laser-500">
                      <Check className="size-3.5 text-ink-900" strokeWidth={3} />
                    </span>
                    <span className="text-ink-100">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/contacto?servicio=${service.slug}`} className="btn-primary mt-10 w-full">
                Consultar mi caso
              </Link>
            </Reveal>
          </aside>
        </div>
      </section>

      {(service.diagram || service.process) && (
        <section className="bg-ink-50 py-24 lg:py-32">
          <div className="container-x">
            <SectionHeading eyebrow="Cómo lo hacemos" title={`${service.name}, paso a paso`} />
            {service.diagram && (
              <Reveal className="mt-12">
                <figure className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
                  <div className="relative overflow-hidden rounded-[2rem] border border-ink-200 bg-white lg:col-span-8">
                    <Image src={service.diagram.image} alt={service.diagram.alt} width={1600} height={1067} sizes="(min-width: 1024px) 820px, 100vw" className="h-auto w-full" />
                    {service.diagram.parts.map((part, i) => (
                      <span
                        key={part.label}
                        aria-hidden="true"
                        className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-laser-500 text-[10px] font-extrabold text-ink-900 shadow-md ring-2 ring-white sm:size-8 sm:text-sm"
                        style={{ left: `${part.x}%`, top: `${part.y}%` }}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </div>
                  <figcaption className="lg:col-span-4">
                    <ol className="grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-y-4">
                      {service.diagram.parts.map((part, i) => (
                        <li key={part.label} className="flex gap-3 text-ink-700">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-laser-500 text-xs font-extrabold text-ink-900">{i + 1}</span>
                          {part.label}
                        </li>
                      ))}
                    </ol>
                  </figcaption>
                </figure>
              </Reveal>
            )}
            {service.process && (
              <ol className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {service.process.map((step, i) => (
                  <Reveal as="li" key={step.title} delay={i * 100} className="rounded-[1.75rem] bg-white p-7 ring-1 ring-ink-200">
                    <span className="font-display text-5xl leading-none font-bold text-laser-500">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-5 text-2xl font-bold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-600">{step.text}</p>
                  </Reveal>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}

      {service.gallery.length > 0 && (
        <section className="pb-24">
          <div className="container-x grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[service.image, ...service.gallery].slice(0, 3).map((src, i) => (
              <Reveal key={src} delay={i * 100} className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem]">
                <Image src={src} alt={`${service.name}: trabajo de Aislaser`} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="bg-ink-50 py-24 lg:py-32">
          <div className="container-x">
            <SectionHeading eyebrow="Obras relacionadas" title="Algunos trabajos realizados" />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.slice(0, 6).map((p, i) => (
                <Reveal key={p.slug} delay={(i % 3) * 100} className="flex">
                  <ProjectCard project={p} className="w-full" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {service.faqs && (
        <section className="py-24 lg:py-32">
          <div className="container-x grid gap-12 lg:grid-cols-12">
            <SectionHeading className="lg:col-span-4" eyebrow="Preguntas frecuentes" title="Lo que más nos preguntan" />
            <div className="divide-y divide-ink-200 border-y border-ink-200 lg:col-span-8">
              {service.faqs.map((f) => (
                <details key={f.q} className="group py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-xl py-4 text-left font-display text-xl font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 leading-relaxed text-ink-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: service.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              }).replace(/</g, "\\u003c"),
            }}
          />
        </section>
      )}

      <section className={service.faqs ? "bg-ink-50 py-24" : "py-24"}>
        <div className="container-x">
          <SectionHeading eyebrow="Otros servicios" title="También te podemos ayudar con" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((s) => (
              <Link
                key={s.slug}
                href={`/servicios/${s.slug}`}
                className="group flex flex-col rounded-3xl border border-ink-200 p-6 transition-all hover:-translate-y-1 hover:border-ink-900"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-ink-900 text-laser-500">
                  <ServiceIcon name={s.icon} className="size-5" />
                </span>
                <span className="mt-6 font-display text-xl leading-tight font-bold text-ink-900">{s.name}</span>
                <ArrowUpRight className="mt-4 size-5 text-ink-400 transition-colors group-hover:text-ink-900" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
