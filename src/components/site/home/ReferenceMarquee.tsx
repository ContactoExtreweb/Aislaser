import type { Project } from "@/content/projects";

export function ReferenceMarquee({ projects }: { projects: Project[] }) {
  const names = projects.filter((p) => p.sector !== "tecnicas").map((p) => p.title);
  if (names.length === 0) return null;
  const row = [...names, ...names];
  return (
    <section aria-label="Obras de referencia" className="relative overflow-hidden border-y border-ink-200 bg-ink-50 py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-50 to-transparent sm:w-48" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-50 to-transparent sm:w-48" />
      <div className="flex w-max animate-marquee items-center hover:[animation-play-state:paused]">
        {row.map((name, i) => (
          <span key={i} className="flex items-center" aria-hidden={i >= names.length}>
            <span className="px-7 font-display text-2xl font-semibold whitespace-nowrap text-ink-500 uppercase">{name}</span>
            <span className="size-2 rounded-full bg-laser-500" />
          </span>
        ))}
      </div>
    </section>
  );
}
