import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProjectCard } from "@/components/site/ProjectCard";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Project } from "@/content/projects";
import { pickFeatured } from "@/lib/obras";

/** Las obras marcadas como «destacada» en el panel */
export function FeaturedProjects({ projects }: { projects: Project[] }) {
  const items = pickFeatured(projects);
  const layout = [
    "lg:col-span-7 lg:row-span-2 min-h-[420px]",
    "lg:col-span-5",
    "lg:col-span-5",
    "lg:col-span-4",
    "lg:col-span-4",
    "lg:col-span-4",
  ];
  return (
    <section className="py-24 lg:py-32">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Obras realizadas"
            title="Proyectos que hablan por nosotros"
            intro="Aeropuertos, centrales, hospitales, piscinas y edificios singulares en toda España. Una selección de nuestro trabajo."
          />
          <Link href="/obras" className="btn-dark shrink-0 self-start lg:self-auto">
            Ver las {projects.length} obras <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
          {items.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 100} className={`${layout[i]} flex`}>
              <ProjectCard
                project={p}
                className="w-full"
                sizes={i === 0 ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
