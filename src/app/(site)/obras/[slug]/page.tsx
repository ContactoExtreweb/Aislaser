import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Camera, Check, Layers, MapPin } from "lucide-react";
import { CtaBand } from "@/components/site/CtaBand";
import { Gallery } from "@/components/site/Gallery";
import { PageHero } from "@/components/site/PageHero";
import { ProjectCard } from "@/components/site/ProjectCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { baseOpenGraph } from "@/content/company";
import { sectors } from "@/content/projects";
import { services } from "@/content/services";
import { getProject, getProjects, splitDescription } from "@/lib/obras";

// Las obras nuevas del panel se generan al primer visitante (dynamicParams) y se guardan en caché
export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/obras/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description:
      project.summary ??
      `${project.title}${project.location ? ` (${project.location})` : ""}: obra de ${sectors[project.sector].label.toLowerCase()} realizada por Aislaser.`,
    alternates: { canonical: `/obras/${project.slug}` },
    openGraph: { ...baseOpenGraph, title: project.title, images: [{ url: project.images[0].src }] },
  };
}

export default async function ProjectPage({ params }: PageProps<"/obras/[slug]">) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const i = projects.indexOf(project);
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];
  const relatedServices = services.filter((s) => project.services?.includes(s.slug));
  const description = splitDescription(project.description);
  const sameSector = projects.filter((p) => p.sector === project.sector && p.slug !== project.slug).slice(0, 3);

  return (
    <>
      <PageHero
        eyebrow={sectors[project.sector].label}
        title={project.title}
        intro={project.summary}
        image={project.images[0].src}
        crumbs={[{ href: "/obras", label: "Obras" }, { label: project.title }]}
      >
        <ul className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
          {project.location && (
            <li className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
              <MapPin className="size-4 text-laser-500" /> {project.location}
            </li>
          )}
          {project.year && (
            <li className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
              <CalendarDays className="size-4 text-laser-500" /> {project.year}
            </li>
          )}
          <li className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
            <Camera className="size-4 text-laser-500" /> {project.images.length === 1 ? "1 fotografía" : `${project.images.length} fotografías`}
          </li>
          {relatedServices.map((s) => (
            <li key={s.slug}>
              <Link href={`/servicios/${s.slug}`} className="flex items-center gap-2 rounded-full bg-laser-500 px-4 py-2 text-ink-900">
                <Layers className="size-4" /> {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </PageHero>

      <section className="py-16 lg:py-24">
        <div className="container-x">
          {description.length > 0 && (
            <div className="mb-14 max-w-3xl">
              {description.map((b, k) =>
                b.type === "p" ? (
                  <p key={k} className="mb-5 text-lg leading-relaxed text-ink-600">
                    {b.text}
                  </p>
                ) : (
                  <ul key={k} className="mb-6 grid gap-3">
                    {b.items.map((item, j) => (
                      <li key={j} className="flex gap-3 text-lg leading-relaxed text-ink-700">
                        <Check className="mt-1 size-5 shrink-0 rounded-full bg-laser-500 p-1 text-ink-900" strokeWidth={3} />
                        {item}
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          )}
          <Gallery images={project.images} title={project.title} />

          {projects.length > 1 && (
            <nav className="mt-12 grid gap-4 sm:grid-cols-2" aria-label="Otras obras">
              <Link href={`/obras/${prev.slug}`} className="group flex items-center gap-4 rounded-3xl border border-ink-200 p-6 transition-colors hover:border-ink-900">
                <ArrowLeft className="size-5 shrink-0 transition-transform group-hover:-translate-x-1" />
                <span>
                  <span className="block text-xs font-bold tracking-widest text-ink-400 uppercase">Anterior</span>
                  <span className="font-display text-xl font-bold text-ink-900">{prev.title}</span>
                </span>
              </Link>
              <Link href={`/obras/${next.slug}`} className="group flex items-center justify-end gap-4 rounded-3xl border border-ink-200 p-6 text-right transition-colors hover:border-ink-900">
                <span>
                  <span className="block text-xs font-bold tracking-widest text-ink-400 uppercase">Siguiente</span>
                  <span className="font-display text-xl font-bold text-ink-900">{next.title}</span>
                </span>
                <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </nav>
          )}
        </div>
      </section>

      {sameSector.length > 0 && (
        <section className="bg-ink-50 py-20 lg:py-28">
          <div className="container-x">
            <SectionHeading eyebrow={sectors[project.sector].short} title="Más obras del sector" />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sameSector.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="h-5" />
      <CtaBand />
    </>
  );
}
