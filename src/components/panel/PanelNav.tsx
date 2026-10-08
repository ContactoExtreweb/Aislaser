"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, FileText, Inbox, LogOut, Settings } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { signOut } from "@/app/panel/actions";

export function PanelNav({ email, unread }: { email: string; unread: number }) {
  const pathname = usePathname();
  const links = [
    { href: "/panel", label: "Dosieres", icon: FileText, active: pathname === "/panel" || pathname.startsWith("/panel/dosieres") },
    { href: "/panel/mensajes", label: "Mensajes", icon: Inbox, active: pathname.startsWith("/panel/mensajes"), badge: unread },
    { href: "/panel/ajustes", label: "Ajustes", icon: Settings, active: pathname.startsWith("/panel/ajustes") },
  ];
  return (
    <nav className="border-b border-white/5 bg-ink-950 text-white print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/panel" className="mr-2 flex items-center gap-2.5" aria-label="Panel de Aislaser">
          <LogoMark variant="white" className="h-8 w-auto" />
          <span className="hidden text-xs font-extrabold tracking-[0.22em] text-ink-400 uppercase sm:inline">Panel</span>
        </Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
              l.active ? "bg-white/10 text-white" : "text-ink-400 hover:text-white"
            }`}
          >
            <l.icon className="size-4" />
            <span className={l.href === "/panel/ajustes" ? "hidden sm:inline" : ""}>{l.label}</span>
            {!!l.badge && <span className="rounded-full bg-laser-500 px-1.5 text-[11px] text-ink-900">{l.badge}</span>}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-400 hover:text-white md:flex">
            Ver web <ExternalLink className="size-3.5" />
          </Link>
          <span className="hidden max-w-[180px] truncate px-2 text-sm text-ink-400 lg:inline">{email}</span>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-ink-300 hover:bg-white/10 hover:text-white" title="Cerrar sesión">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
