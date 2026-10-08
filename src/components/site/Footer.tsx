import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Dots, Logo } from "@/components/brand/Logo";
import { company } from "@/content/company";
import { services } from "@/content/services";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-ink-950 text-ink-300">
      <div className="bg-grid-dark absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative container-x pt-20 pb-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo variant="white" className="h-10 w-auto" />
            <p className="mt-6 max-w-sm leading-relaxed text-ink-400">
              Especialistas en impermeabilización de cubiertas técnicas con poliurea y poliuretano proyectado. Desde
              Campanario (Badajoz) para toda España.
            </p>
            <Dots tone="light" className="mt-8" />
          </div>

          <div className="lg:col-span-3">
            <h3 className="font-sans text-xs font-extrabold tracking-[0.22em] text-white uppercase">Servicios</h3>
            <ul className="mt-5 space-y-3">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/servicios/${s.slug}`} className="transition-colors hover:text-laser-500">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-sans text-xs font-extrabold tracking-[0.22em] text-white uppercase">Aislaser</h3>
            <ul className="mt-5 space-y-3">
              <li><Link href="/empresa" className="transition-colors hover:text-laser-500">Empresa</Link></li>
              <li><Link href="/obras" className="transition-colors hover:text-laser-500">Obras realizadas</Link></li>
              <li><Link href="/contacto" className="transition-colors hover:text-laser-500">Contacto</Link></li>
              <li><Link href="/panel" className="transition-colors hover:text-laser-500">Área privada</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="font-sans text-xs font-extrabold tracking-[0.22em] text-white uppercase">Contacto</h3>
            <ul className="mt-5 space-y-4">
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-laser-500" />
                <span className="flex flex-col">
                  {company.phones.map((p) => (
                    <a key={p.href} href={p.href} className="font-bold text-white transition-colors hover:text-laser-500">
                      {p.label}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-laser-500" />
                <a href={`mailto:${company.email}`} className="transition-colors hover:text-laser-500">
                  {company.email}
                </a>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-laser-500" />
                <a href={company.mapsUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-laser-500">
                  {company.address.street}
                  <br />
                  {company.address.postalCode} {company.address.city} ({company.address.province})
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-ink-500 md:flex-row md:items-center md:justify-between">
          <p>© {year} {company.legalName} Todos los derechos reservados.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link href="/aviso-legal" className="hover:text-white">Aviso legal</Link></li>
            <li><Link href="/privacidad" className="hover:text-white">Privacidad</Link></li>
            <li><Link href="/cookies" className="hover:text-white">Cookies</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
