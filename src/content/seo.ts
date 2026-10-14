import type { Metadata } from "next";

/**
 * SEO de la web en un solo sitio: los títulos y descripciones que enseña Google.
 *
 * Cuando lleguen las palabras clave del cliente se reparten aquí y en los servicios
 * (src/content/services.ts, campo «seo»), una palabra clave principal por página:
 *  · en el título, lo más al principio posible (Google muestra unos 60 caracteres);
 *  · en la descripción (unos 155 caracteres), escrita para que den ganas de pulsar;
 *  · en el H1 y en el primer párrafo de la página, con naturalidad.
 * Las páginas de cada obra toman su título y su resumen del panel (Obras web).
 */

export const siteTitle = {
  default: "Aislaser · Impermeabilización de cubiertas con poliurea y poliuretano",
  template: "%s · Aislaser",
};

/** Google no usa esta etiqueta para posicionar, pero otros buscadores sí la leen */
export const siteKeywords = [
  "impermeabilización",
  "poliurea",
  "poliuretano proyectado",
  "impermeabilización de cubiertas",
  "cubiertas técnicas",
  "aislamiento térmico",
  "aislamiento acústico",
  "aislamiento por insuflado",
  "corte de hormigón",
  "Badajoz",
  "Extremadura",
];

type PageSeo = Pick<Metadata, "title" | "description">;

export const pageSeo = {
  /** Portada: usa el título por defecto (siteTitle.default) y la descripción de la empresa */
  inicio: {} as PageSeo,
  empresa: {
    title: "Empresa",
    description:
      "Aislaser es una empresa especializada en recubrimientos de última generación de poliureas y poliuretanos, con más de 15 años de experiencia y sede en Campanario (Badajoz).",
  },
  servicios: {
    title: "Servicios",
    description:
      "Impermeabilización con poliurea y poliuretano proyectado, aislamientos térmicos y acústicos, aislamiento por insuflado, taladro y corte de hormigón, refuerzo de estructuras y chorreado de arena.",
  },
  obras: {
    title: "Obras y clientes",
    description:
      "Aeropuertos, centrales energéticas, hospitales, piscinas, parkings y viviendas: descubre las obras de impermeabilización y aislamiento realizadas por Aislaser.",
  },
  contacto: {
    title: "Contacto",
    description:
      "Contacta con Aislaser sin compromiso: 609 005 163 · 619 987 792 · aislaser@aislaser.es. Pol. Ind. Campanario, Nave 2 y 3, Campanario (Badajoz).",
  },
} satisfies Record<string, PageSeo>;
