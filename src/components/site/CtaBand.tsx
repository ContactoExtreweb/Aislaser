import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { company } from "@/content/company";

export function CtaBand({
  title = "¿Filtraciones, humedades o un proyecto nuevo?",
  text = "Contacta con nosotros sin compromiso y te asesoraremos sobre la mejor solución para tu proyecto.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="px-3 pb-3 sm:px-5 sm:pb-5">
      <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-laser-500 px-6 py-16 sm:px-12 lg:py-24">
        <svg aria-hidden="true" viewBox="0 0 400 400" className="absolute -top-24 -right-24 h-[520px] w-[520px] text-ink-900/[0.06]">
          <path d="M200 10 L390 390 L340 390 L200 110 L60 390 L10 390 Z" fill="currentColor" />
        </svg>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-4xl leading-[1] font-bold text-ink-900 sm:text-5xl lg:text-6xl">{title}</h2>
            <p className="mt-5 text-lg font-medium text-ink-800">{text}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/contacto" className="btn-dark text-base">
              Solicitar presupuesto <ArrowRight className="size-4" />
            </Link>
            <a href={company.phones[0].href} className="btn border border-ink-900/20 text-base text-ink-900 hover:bg-ink-900/5">
              <Phone className="size-4" /> {company.phones[0].label}
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
