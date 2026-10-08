import type { Metadata } from "next";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { ProjectsExplorer } from "@/components/site/ProjectsExplorer";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Obras y clientes",
  description:
    "Aeropuertos, centrales energéticas, hospitales, piscinas, parkings y viviendas: descubre las obras de impermeabilización y aislamiento realizadas por Aislaser.",
  alternates: { canonical: "/obras" },
};

export default function ObrasPage() {
  return (
    <>
      <PageHero
        eyebrow="Obras y clientes"
        title="Más de 30 obras que avalan nuestro trabajo"
        intro="De aeropuertos y centrales energéticas a piscinas municipales y viviendas particulares. Filtra por sector y descubre cada proyecto."
        image="/images/site/banner-terminal.webp"
        crumbs={[{ label: "Obras" }]}
      >
        <p className="mt-8 text-sm font-bold text-ink-400">{projects.length} obras · {projects.reduce((n, p) => n + p.images.length, 0)} fotografías</p>
      </PageHero>
      <section className="py-20 lg:py-28">
        <div className="container-x">
          <ProjectsExplorer />
        </div>
      </section>
      <CtaBand title="¿Tu obra será la próxima?" />
    </>
  );
}
