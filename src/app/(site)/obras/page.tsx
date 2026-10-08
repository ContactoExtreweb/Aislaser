import type { Metadata } from "next";
import { CtaBand } from "@/components/site/CtaBand";
import { PageHero } from "@/components/site/PageHero";
import { ProjectsExplorer } from "@/components/site/ProjectsExplorer";
import { getProjects } from "@/lib/obras";

export const metadata: Metadata = {
  title: "Obras y clientes",
  description:
    "Aeropuertos, centrales energéticas, hospitales, piscinas, parkings y viviendas: descubre las obras de impermeabilización y aislamiento realizadas por Aislaser.",
  alternates: { canonical: "/obras" },
};

export default async function ObrasPage() {
  const projects = await getProjects();
  const photos = projects.reduce((n, p) => n + p.images.length, 0);
  return (
    <>
      <PageHero
        eyebrow="Obras y clientes"
        title={projects.length >= 30 ? "Más de 30 obras que avalan nuestro trabajo" : "Obras que avalan nuestro trabajo"}
        intro="De aeropuertos y centrales energéticas a piscinas municipales y viviendas particulares. Filtra por sector y descubre cada proyecto."
        image="/images/site/banner-terminal.webp"
        crumbs={[{ label: "Obras" }]}
      >
        {projects.length > 0 && (
          <p className="mt-8 text-sm font-bold text-ink-400">
            {projects.length === 1 ? "1 obra" : `${projects.length} obras`} · {photos === 1 ? "1 fotografía" : `${photos} fotografías`}
          </p>
        )}
      </PageHero>
      <section className="py-20 lg:py-28">
        <div className="container-x">
          <ProjectsExplorer projects={projects} />
        </div>
      </section>
      <CtaBand title="¿Tu obra será la próxima?" />
    </>
  );
}
