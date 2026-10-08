import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Phone } from "lucide-react";
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
  return {
    title: service.title,
    description: `${service.summary} ${service.intro[0]}`.slice(0, 300),
    alternates: { canonical: `/servicios/${service.slug}` },
    openGraph: { ...baseOpenGraph, title: service.title, images: [{ url: service.image }] },
  };
}

export default async function ServicePage({ params }: PageProps<"/servicios/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

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

      <section className="py-24">
        <div className="container-x">
          <SectionHeading eyebrow="Otros servicios" title="También te podemos ayudar con" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
