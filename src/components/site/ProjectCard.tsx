import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { sectors, type Project } from "@/content/projects";

export function ProjectCard({ project, sizes, className }: { project: Project; sizes?: string; className?: string }) {
  const cover = project.images[0];
  return (
    <Link
      href={`/obras/${project.slug}`}
      className={`group relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-ink-900 ${className ?? ""}`}
    >
      <Image
        src={cover.src}
        alt={project.title}
        fill
        sizes={sizes ?? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/30 to-transparent transition-opacity duration-500 group-hover:from-ink-950" />
      <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold tracking-wider text-ink-900 uppercase backdrop-blur">
        {sectors[project.sector].short}
      </span>
      <span className="absolute top-4 right-4 grid size-10 translate-y-2 place-items-center rounded-full bg-laser-500 text-ink-900 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
        <ArrowUpRight className="size-5" />
      </span>
      <div className="relative p-6">
        <h3 className="text-2xl leading-tight font-bold text-white sm:text-[1.7rem]">{project.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-300">
          {project.location ? (
            <>
              <MapPin className="size-3.5 text-laser-500" /> {project.location}
            </>
          ) : (
            <>{project.images.length === 1 ? "1 fotografía" : `${project.images.length} fotografías`}</>
          )}
        </p>
      </div>
    </Link>
  );
}
