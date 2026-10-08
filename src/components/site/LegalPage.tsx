import { PageHero } from "@/components/site/PageHero";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Información legal" title={title} image="/images/site/banner-terminal.webp" crumbs={[{ label: title }]} />
      <section className="py-20">
        <div className="container-x">
          <article className="mx-auto max-w-3xl space-y-5 leading-relaxed text-ink-700 [&_h2]:mt-12 [&_h2]:text-3xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink-900">
            <p className="text-sm text-ink-400">Última actualización: {updated}</p>
            {children}
          </article>
        </div>
      </section>
    </>
  );
}
