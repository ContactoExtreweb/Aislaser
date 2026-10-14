export type Service = {
  slug: string;
  /** Nombre corto para menús y tarjetas */
  name: string;
  /** Título largo (H1 de la página) */
  title: string;
  /** Frase de una línea para tarjetas */
  summary: string;
  /** Texto introductorio de la página */
  intro: string[];
  image: string;
  gallery: string[];
  icon: "droplets" | "spray" | "thermometer" | "wind" | "drill" | "layers" | "anchor";
  /** Ventajas / características */
  features: string[];
  /** Dónde se aplica */
  applications: string[];
  /** Cómo se hace, paso a paso */
  process?: { title: string; text: string }[];
  /** Esquema con partes numeradas (posiciones en % de la imagen) */
  diagram?: { image: string; alt: string; parts: { x: number; y: number; label: string }[] };
  /** Preguntas frecuentes (también van como datos estructurados para Google) */
  faqs?: { q: string; a: string }[];
  /** Título y descripción para Google si deben ser distintos de los de la página (palabras clave) */
  seo?: { title?: string; description?: string };
  /** Slugs de obras relacionadas */
  projects: string[];
  /** URL antigua de la web anterior (para redirecciones 301) */
  legacyPath?: string;
};

export const services: Service[] = [
  {
    slug: "poliurea",
    name: "Poliurea",
    title: "Impermeabilización con poliurea proyectada",
    summary: "Membrana continua, sin juntas y sin mantenimiento para cubiertas, piscinas y pavimentos.",
    intro: [
      "La poliurea es el sistema de impermeabilización más avanzado del mercado: una membrana líquida que se proyecta en caliente, cura en segundos y forma una capa continua, elástica y totalmente estanca, sin juntas ni solapes.",
      "Recomendamos la impermeabilización con poliurea en cubiertas, terrazas, jardines y piscinas, y allí donde una impermeabilización anterior deficiente esté provocando filtraciones o humedades. También en naves industriales, instalaciones comerciales y parkings donde se necesita un pavimento más resistente.",
      "Nuestros sistemas no sólo cumplen los requisitos técnicos más exigentes: también abren nuevas posibilidades estéticas a proyectistas y propietarios de edificios singulares.",
    ],
    image: "/images/site/poliurea-aplicacion.webp",
    gallery: [
      "/images/site/poliurea-cubierta-verde.webp",
      "/images/site/poliurea-edificio.webp",
      "/images/site/hero-poliurea-cubierta.webp",
    ],
    icon: "droplets",
    features: [
      "Recubre cualquier forma irregular existente",
      "Máxima adherencia a cualquier soporte",
      "Se aplica sobre metal, madera, hormigón, aluminio, fibra de vidrio o cemento",
      "Secado fácil y muy rápido",
      "Impermeabilidad total, sin juntas",
      "Alta resistencia a temperaturas extremas",
      "Resistente a los cambios climáticos",
      "Protección contra la corrosión",
      "Acabado antideslizante y en diferentes colores",
      "No requiere mantenimiento",
    ],
    applications: [
      "Cubiertas planas y técnicas",
      "Terrazas y jardines",
      "Piscinas y vasos",
      "Depósitos y balsas",
      "Naves industriales",
      "Parkings y pavimentos",
    ],
    projects: [
      "aeropuerto-de-sevilla-t1",
      "piscina-de-cordoba",
      "conideck-boadilla",
      "hospital-de-huelva",
      "central-termica-de-algeciras",
      "vivienda-en-villanueva-de-la-serena",
    ],
    legacyPath: "/servicios/poliureas.html",
  },
  {
    slug: "poliuretano",
    name: "Poliuretano proyectado",
    title: "Impermeabilización con poliuretano proyectado",
    summary: "Impermeabilización y aislamiento en una sola capa, con materiales de primer nivel.",
    intro: [
      "Realizamos impermeabilizaciones con poliuretano proyectado que permiten un aislamiento total de la superficie en la que se aplican.",
      "Con este mismo material ejecutamos aislamientos térmicos y acústicos que consiguen el máximo rendimiento. Trabajamos con materiales de primer nivel gracias a nuestra colaboración con los principales fabricantes del sector.",
      "La satisfacción de nuestros clientes es el principal aval de nuestro trabajo: un equipo de profesionales de la construcción que ejecuta cada impermeabilización de forma eficaz y con un resultado duradero.",
    ],
    image: "/images/site/poliuretano-fachada.webp",
    gallery: ["/images/site/poliuretano-obra.webp", "/images/site/poliuretano-detalle.webp"],
    icon: "spray",
    features: [
      "Impermeabiliza y aísla en una única aplicación",
      "Capa continua sin juntas ni puentes térmicos",
      "Muy ligero: no sobrecarga la estructura",
      "Se adapta a geometrías complejas y fachadas singulares",
      "Aplicación rápida, con mínima interferencia en la actividad",
      "Materiales certificados de fabricantes líderes",
    ],
    applications: [
      "Cubiertas de naves y edificios",
      "Fachadas y edificios singulares",
      "Cámaras y forjados",
      "Rehabilitación energética",
    ],
    projects: ["palacio-de-congresos-villanueva-de-la-serena", "cetarsa", "ifepa-murcia"],
    legacyPath: "/servicios/poliuretano.html",
  },
  {
    slug: "aislamientos",
    name: "Aislamientos térmicos y acústicos",
    title: "Aislamientos térmicos y acústicos de poliuretano",
    summary: "Proyección de espumas de poliuretano para un sellado completo y máximo confort.",
    intro: [
      "Aplicamos aislamientos térmicos y acústicos de poliuretano mediante proyección de espuma, que permite un sellado completo de la superficie sin juntas ni huecos.",
      "Incorporamos las últimas innovaciones del sector en I+D realizadas por instituciones de todo el mundo y ofrecemos soluciones integrales en impermeabilización y aislamiento con los mejores materiales.",
      "Consúltanos sin compromiso: te asesoramos para que consigas el mejor resultado en tu proyecto.",
    ],
    image: "/images/site/aislamiento-cubierta.webp",
    gallery: ["/images/site/aislamiento-aeropuerto.webp", "/images/site/empresa-cubierta.webp"],
    icon: "thermometer",
    features: [
      "Sellado completo de la superficie",
      "Reduce la demanda de calefacción y refrigeración",
      "Mejora el aislamiento acústico",
      "Elimina puentes térmicos",
      "Espumas especiales según cada necesidad",
    ],
    applications: [
      "Cubiertas metálicas y de fibrocemento",
      "Naves agrícolas e industriales",
      "Cámaras frigoríficas",
      "Edificios públicos y viviendas",
    ],
    projects: ["aeropuerto-de-sevilla-t2", "cetarsa", "ifepa-murcia"],
    legacyPath: "/servicios/aislamientos.html",
  },
  {
    slug: "insuflado",
    name: "Aislamiento por insuflado",
    title: "Aislamiento por insuflado en cámaras de aire",
    summary: "Rellenamos la cámara de aire de fachadas y techos con aislante, sin obras y en muy poco tiempo.",
    intro: [
      "El insuflado es una de las formas más rápidas y limpias de aislar un edificio que ya está construido. Muchas fachadas de ladrillo tienen dos hojas separadas por una cámara de aire vacía, que aísla muy poco: en invierno se pierde calor a través del muro y en verano entra. Nosotros rellenamos esa cámara con material aislante, que introducimos a presión a través de pequeños taladros.",
      "No hay obras de albañilería ni hace falta salir de casa. Normalmente se trabaja desde fuera, sin tocar nada por dentro, y una vivienda suele quedar terminada en una o dos jornadas. El cambio se nota desde el primer día: paredes menos frías, menos condensaciones y una factura de calefacción y aire acondicionado más baja.",
      "Antes de insuflar revisamos la cámara (anchura, continuidad y humedad) y elegimos el material más adecuado para cada caso: lana mineral, perlas de poliestireno expandido con grafito (EPS) o espuma de poliuretano.",
    ],
    image: "/images/site/insuflado-fachada.webp",
    gallery: [],
    icon: "wind",
    features: [
      "Sin obras de albañilería ni escombros, y sin salir de casa",
      "Una vivienda suele quedar lista en una o dos jornadas",
      "Mejora el aislamiento térmico y acústico",
      "Paredes menos frías y menos condensaciones",
      "Ahorro en calefacción y aire acondicionado",
      "Relleno homogéneo de toda la cámara",
      "Mejora la calificación energética del edificio",
      "Taladros pequeños que se sellan y apenas se notan",
    ],
    applications: [
      "Fachadas con cámara de aire",
      "Viviendas unifamiliares",
      "Bloques de pisos y comunidades",
      "Bajo cubierta y falsos techos",
      "Tabiques y medianeras",
      "Naves y locales",
    ],
    process: [
      {
        title: "Revisamos la cámara",
        text: "Medimos su anchura y comprobamos con un endoscopio que está libre y seca. Si hace falta, localizamos las zonas más frías con cámara termográfica.",
      },
      {
        title: "Hacemos los taladros",
        text: "Pequeñas perforaciones en las juntas del ladrillo, al tresbolillo y a la distancia que necesita cada material, para llegar a toda la cámara.",
      },
      {
        title: "Insuflamos el aislante",
        text: "Con máquina y a presión controlada, de abajo arriba, hasta llenar la cámara y comprobando que el aislante llega a toda ella.",
      },
      {
        title: "Sellamos y comprobamos",
        text: "Cerramos los taladros con mortero de un tono parecido a la fachada y, si se desea, comprobamos el resultado con cámara termográfica.",
      },
    ],
    diagram: {
      image: "/images/site/insuflado-fachada.webp",
      alt: "Ilustración de una fachada de ladrillo en corte: la cámara de aire entre las dos hojas se rellena de aislante a través de pequeños taladros en las juntas.",
      parts: [
        { x: 40.6, y: 71.2, label: "Hoja exterior de ladrillo" },
        { x: 72.1, y: 25.5, label: "Cámara de aire vacía: aísla muy poco" },
        { x: 72.1, y: 60.1, label: "Aislante insuflado, que rellena la cámara de abajo arriba" },
        { x: 75.7, y: 39.9, label: "Hoja interior y enlucido: normalmente no se toca" },
        { x: 48.8, y: 32.4, label: "Taladros en las juntas, al tresbolillo" },
        { x: 60.9, y: 57.2, label: "Boquilla de insuflado" },
        { x: 26.3, y: 32.4, label: "Taladros ya sellados con mortero" },
      ],
    },
    faqs: [
      {
        q: "¿Cómo sé si mi fachada tiene cámara de aire?",
        a: "Muchas fachadas de ladrillo tienen dos hojas con una cámara entre ellas, a menudo vacía o con un aislamiento muy escaso. Lo comprobamos en la visita con un pequeño taladro y un endoscopio, sin compromiso.",
      },
      {
        q: "¿Hay que hacer obras o salir de casa?",
        a: "No hay obras de albañilería: normalmente se trabaja desde fuera, con taladros pequeños, sin levantar paredes ni mover muebles, y puedes seguir en casa mientras trabajamos. En un bloque de pisos la fachada es de la comunidad, así que hace falta su acuerdo; te ayudamos con los trámites.",
      },
      {
        q: "¿Cuánto se tarda?",
        a: "Depende de la superficie y del acceso, pero una vivienda unifamiliar suele quedar terminada en una o dos jornadas.",
      },
      {
        q: "¿Qué material se usa?",
        a: "Depende de la cámara: lana mineral, perlas de EPS con grafito o espuma de poliuretano. Te recomendamos el más adecuado después de revisar tu fachada.",
      },
      {
        q: "¿Se nota en la factura?",
        a: "Sí. La fachada es una de las principales vías por las que una vivienda pierde calor en invierno y lo gana en verano; al rellenar la cámara se reducen esas pérdidas y la climatización trabaja menos.",
      },
    ],
    projects: [],
  },
  {
    slug: "taladro-y-corte-de-hormigon",
    name: "Taladro y corte de hormigón",
    title: "Taladro y corte de hormigón",
    summary: "Corte con disco diamantado y perforaciones de gran diámetro en cualquier dirección.",
    intro: [
      "Realizamos corte con disco mural diamantado para la apertura de huecos de ventanas, puertas, correcciones y otros huecos en hormigón. También para rozas, juntas de dilatación, reparación de daños en hormigón, huecos de escaleras, ascensores y demás.",
      "Ejecutamos series de taladros que pueden alcanzar un gran diámetro, en horizontal, vertical o con inclinación. Las perforaciones sirven tanto en vivienda particular (bajantes, montantes, W.C., ventilaciones, pilares…) como en obra civil (iluminación en suelo, pilares…).",
    ],
    image: "/images/site/taladro-perforacion.webp",
    gallery: ["/images/site/corte-disco.webp", "/images/site/taladro-interior.webp"],
    icon: "drill",
    features: [
      "Corte con disco mural diamantado",
      "Perforaciones de gran diámetro",
      "Taladros horizontales, verticales o inclinados",
      "Trabajo limpio y preciso, sin vibraciones dañinas",
      "Para obra civil y vivienda particular",
    ],
    applications: [
      "Apertura de huecos de puertas y ventanas",
      "Huecos de escaleras y ascensores",
      "Rozas y juntas de dilatación",
      "Pasos de bajantes, montantes y ventilaciones",
      "Iluminación empotrada en suelo",
    ],
    projects: ["cortes-y-taladros"],
    legacyPath: "/servicios/taladro-y-corte-de-hormigón.html",
  },
  {
    slug: "refuerzo-de-estructuras",
    name: "Refuerzo de estructuras",
    title: "Refuerzo de estructuras con fibra de carbono",
    summary: "Laminados y tejidos de fibra de carbono para recuperar y aumentar la capacidad portante.",
    intro: [
      "Reforzamos estructuras de hormigón mediante laminados y tejidos de fibra de carbono adheridos al elemento existente, una técnica que aumenta su capacidad resistente sin apenas añadir peso ni sección.",
      "Es la solución idónea para cambios de uso, aumentos de carga, corrección de defectos de ejecución o reparación de elementos dañados, con una intervención rápida y poco invasiva.",
    ],
    image: "/images/site/equipo-puente.webp",
    gallery: ["/images/site/banner-taladro.webp"],
    icon: "layers",
    features: [
      "Aumenta la capacidad portante de vigas, pilares y forjados",
      "Prácticamente no añade peso ni sección",
      "Intervención rápida y poco invasiva",
      "Material inalterable frente a la corrosión",
    ],
    applications: ["Vigas y forjados", "Pilares", "Puentes y obra civil", "Rehabilitación de edificios"],
    projects: [],
  },
  {
    slug: "anclajes-inyecciones-y-chorreado",
    name: "Anclajes, inyecciones y chorreado",
    title: "Anclajes, rellenos, inyecciones y chorreado de arena",
    summary: "Preparación de soportes y trabajos técnicos complementarios de alta precisión.",
    intro: [
      "Ejecutamos anclajes, rellenos e inyecciones en elementos de hormigón y fábrica, así como chorreado de arena para la limpieza y preparación de superficies.",
      "Una buena preparación del soporte es la base de cualquier impermeabilización duradera: por eso dominamos todo el proceso, desde el chorreado hasta el acabado final.",
    ],
    image: "/images/obras/chorro-de-arena/01.webp",
    gallery: ["/images/obras/depositos-de-alpechin/01.webp"],
    icon: "anchor",
    features: [
      "Chorreado de arena para limpieza y preparación de soportes",
      "Anclajes químicos y mecánicos",
      "Rellenos e inyecciones de fisuras",
      "Preparación previa a impermeabilizaciones",
    ],
    applications: ["Depósitos y balsas", "Estructuras metálicas", "Soportes de hormigón", "Obra civil"],
    projects: ["chorro-de-arena", "depositos-de-alpechin"],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
