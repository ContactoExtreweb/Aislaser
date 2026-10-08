export const company = {
  name: "Aislaser",
  legalName: "Aislaser C.B.",
  tagline: "Impermeabilización de cubiertas técnicas con poliurea y poliuretano",
  description:
    "Empresa especializada en impermeabilización de cubiertas técnicas con recubrimientos de última generación de poliureas y poliuretanos, aislamientos térmicos y acústicos, refuerzo de estructuras y corte y taladro de hormigón. Con sede en Campanario (Badajoz) y obras en toda España.",
  phones: [
    { label: "609 005 163", href: "tel:+34609005163" },
    { label: "619 987 792", href: "tel:+34619987792" },
  ],
  /** Teléfono fijo y fax (membrete oficial) */
  landline: { label: "924 85 18 23", href: "tel:+34924851823" },
  email: "aislaser@aislaser.es",
  cif: "E06339493",
  registry: "76/01",
  letterheadTagline: "AISLAMIENTOS Y SERVICIOS",
  /** Línea de actividades del pie del membrete */
  activities: [
    "Poliureas",
    "Suelos Industriales",
    "Poliuretano",
    "Impermeabilizaciones",
    "Techos Desmontables",
    "Pladur",
    "Insonorizaciones",
    "Taladros en Hormigón",
    "Cortes de Hormigón",
    "Chorro de Arena",
  ],
  address: {
    street: "Pol. Ind. Campanario, Nave 2 y 3",
    city: "Campanario",
    province: "Badajoz",
    postalCode: "06460",
    region: "Extremadura",
    country: "ES",
  },
  geo: { lat: 38.8644, lng: -5.6175 },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Aislaser+Pol%C3%ADgono+Industrial+Campanario+Badajoz",
  youtubeId: "aF-nqiuiyII",
  yearsExperience: "+15",
} as const;

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aislaser.es").replace(/\/$/, "");
