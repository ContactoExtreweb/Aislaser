import type { NextConfig } from "next";
import { projects } from "./src/content/projects";
import { services } from "./src/content/services";

// Redirecciones 301 desde las URLs de la web anterior (Joomla) para no perder posicionamiento
const legacyRedirects = [
  { source: "/index.php", destination: "/" },
  { source: "/quienes-somos.html", destination: "/empresa" },
  { source: "/servicios.html", destination: "/servicios" },
  { source: "/obras-y-clientes.html", destination: "/obras" },
  { source: "/contacto.html", destination: "/contacto" },
  ...services
    .filter((s) => s.legacyPath)
    .map((s) => ({ source: encodeURI(s.legacyPath!), destination: `/servicios/${s.slug}` })),
  ...projects.map((p) => ({
    source: `/obras-y-clientes/event/obras/${p.legacy}.html`,
    destination: `/obras/${p.slug}`,
  })),
].map((r) => ({ ...r, permanent: true }));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return legacyRedirects;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
