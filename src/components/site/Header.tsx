"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Menu, Phone, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { company } from "@/content/company";
import { services } from "@/content/services";

const nav = [
  { href: "/empresa", label: "Empresa" },
  { href: "/servicios", label: "Servicios", hasMenu: true },
  { href: "/obras", label: "Obras" },
  { href: "/contacto", label: "Contacto" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const solid = scrolled && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid ? "border-b border-ink-200/70 bg-white/85 shadow-[0_10px_40px_-20px_rgb(0_0_0/0.25)] backdrop-blur-xl" : ""
      }`}
    >
      <div className={`container-x flex items-center justify-between transition-all duration-500 ${solid ? "h-16" : "h-20 lg:h-24"}`}>
        <Link href="/" aria-label="Aislaser, ir al inicio" className="relative z-10 shrink-0">
          <Logo variant={solid ? "color" : "white"} className={`transition-all duration-500 ${solid ? "h-8" : "h-9 lg:h-10"} w-auto`} />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const color = solid ? "text-ink-700 hover:text-ink-950" : "text-white/85 hover:text-white";
            if (item.hasMenu) {
              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${color}`}
                    aria-expanded={servicesOpen}
                    onFocus={() => setServicesOpen(true)}
                  >
                    {item.label}
                    <ChevronDown className={`size-4 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
                    {active && <ActiveDot />}
                  </Link>
                  <div
                    className={`absolute top-full left-1/2 w-[640px] -translate-x-1/2 pt-3 transition-all duration-300 ${
                      servicesOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-1 rounded-3xl border border-ink-200 bg-white p-3 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.35)]">
                      {services.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/servicios/${s.slug}`}
                          className="group flex gap-3 rounded-2xl p-3 transition-colors hover:bg-ink-50"
                          onBlur={(e) => {
                            if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setServicesOpen(false);
                          }}
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-900 text-laser-500 transition-transform group-hover:scale-105">
                            <ServiceIcon name={s.icon} className="size-5" />
                          </span>
                          <span>
                            <span className="block text-sm font-extrabold text-ink-900">{s.name}</span>
                            <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-500">{s.summary}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-4 py-2 text-sm font-bold transition-colors ${color}`}
              >
                {item.label}
                {active && <ActiveDot />}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={company.phones[0].href}
            className={`flex items-center gap-2 text-sm font-bold transition-colors ${solid ? "text-ink-700" : "text-white"}`}
          >
            <Phone className="size-4 text-laser-500" />
            {company.phones[0].label}
          </a>
          <Link href="/contacto" className="btn-primary !py-2.5">
            Pide presupuesto
          </Link>
        </div>

        <button
          type="button"
          className={`relative z-10 grid size-11 place-items-center rounded-full lg:hidden ${
            solid ? "bg-ink-900 text-white" : open ? "bg-white text-ink-900" : "bg-white/10 text-white backdrop-blur"
          }`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Menú móvil */}
      <div
        className={`fixed inset-0 bg-ink-950 transition-all duration-500 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="bg-grid-dark absolute inset-0 opacity-60" />
        <div className="relative flex h-full flex-col overflow-y-auto px-6 pt-28 pb-10">
          <nav aria-label="Móvil" className="flex flex-col">
            {[{ href: "/", label: "Inicio" }, ...nav].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between border-b border-white/10 py-4 font-display text-4xl font-bold text-white"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                {item.label}
                <ArrowRight className="size-6 text-laser-500" />
              </Link>
            ))}
          </nav>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {services.map((s) => (
              <Link key={s.slug} href={`/servicios/${s.slug}`} className="rounded-xl bg-white/5 px-3 py-3 text-sm font-semibold text-ink-200">
                {s.name}
              </Link>
            ))}
          </div>
          <div className="mt-auto space-y-3 pt-10">
            {company.phones.map((p) => (
              <a key={p.href} href={p.href} className="btn-primary w-full">
                <Phone className="size-4" /> Llamar al {p.label}
              </a>
            ))}
            <a href={`mailto:${company.email}`} className="btn-ghost-light w-full">
              {company.email}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

function ActiveDot() {
  return <span className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-laser-500" />;
}
