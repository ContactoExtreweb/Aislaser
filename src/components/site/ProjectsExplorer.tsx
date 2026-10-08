"use client";

import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/site/ProjectCard";
import { sectors, type Project, type Sector } from "@/content/projects";

type Filter = Sector | "todas";

export function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<Filter>("todas");

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: projects.length };
    projects.forEach((p) => (c[p.sector] = (c[p.sector] ?? 0) + 1));
    return c;
  }, [projects]);

  const visible = filter === "todas" ? projects : projects.filter((p) => p.sector === filter);
  const options: { value: Filter; label: string }[] = [
    { value: "todas", label: "Todas" },
    // Sólo los sectores que tienen alguna obra publicada
    ...(Object.keys(sectors) as Sector[]).filter((s) => counts[s]).map((s) => ({ value: s, label: sectors[s].short })),
  ];

  if (projects.length === 0) {
    return <p className="rounded-[1.75rem] bg-ink-50 p-10 text-center text-lg text-ink-500">Todavía no hay obras publicadas.</p>;
  }

  return (
    <div>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filtrar obras por sector">
        {options.map((o) => {
          const active = filter === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(o.value)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all ${
                active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-900"
              }`}
            >
              {o.label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-laser-500 text-ink-900" : "bg-ink-100 text-ink-500"}`}>
                {counts[o.value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <div
            key={p.slug}
            className="flex animate-[fade-up_0.6s_var(--ease-out-expo)_both]"
            style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}
          >
            <ProjectCard project={p} className="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
