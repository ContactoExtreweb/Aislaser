"use client";

import type { Dossier, DossierImage, DossierRepo } from "./types";

const wait = (ms = 150) => new Promise<void>((r) => setTimeout(r, ms));

/** Modo demostración: todo se guarda sólo en la memoria del navegador */
export function createDemoRepo(): DossierRepo {
  return {
    updateDossier: () => wait(),
    async setCover(_dossier, blob, size) {
      await wait();
      return { path: `demo/${crypto.randomUUID()}.jpg`, url: URL.createObjectURL(blob), ...size };
    },
    removeCover: () => wait(),
    async addPoint(dossierId, position) {
      await wait();
      return { id: crypto.randomUUID(), dossier_id: dossierId, position, title: "", body: "", image_layout: "grid-2", images: [] };
    },
    updatePoint: () => wait(),
    deletePoint: () => wait(),
    reorderPoints: () => wait(),
    async addImage(point, blob, size, position) {
      await wait(400);
      const image: DossierImage = {
        id: crypto.randomUUID(),
        dossier_id: point.dossier_id,
        point_id: point.id,
        storage_path: `demo/${crypto.randomUUID()}.jpg`,
        caption: "",
        position,
        width: size.width,
        height: size.height,
        url: URL.createObjectURL(blob),
      };
      return image;
    },
    updateImage: () => wait(),
    deleteImage: () => wait(),
    reorderImages: () => wait(),
  };
}

// Fecha fija durante la sesión: la demo se comporta como un informe guardado (misma versión al volver)
const DEMO_TIME = new Date().toISOString();

export function demoDossier(): Dossier {
  const now = DEMO_TIME;
  const img = (pointId: string, n: number, src: string, caption: string): DossierImage => ({
    id: `${pointId}-img-${n}`,
    dossier_id: "demo",
    point_id: pointId,
    storage_path: src,
    caption,
    position: n,
    width: 720,
    height: 480,
    url: src,
  });
  // Ejemplo ficticio con la estructura del informe técnico de Aislaser
  return {
    id: "demo",
    template: "informe",
    title: "Informe de filtraciones en cubierta de nave industrial en Mérida",
    subtitle: "Informe técnico",
    attention: "Sr. Juan Martínez López",
    prepared_by: "TÉCNICOS DE AISLASER",
    client_name: "Construcciones Ejemplo, S.L.",
    location: "Mérida (Badajoz)",
    work_date: now.slice(0, 10),
    reference: "INF-2026-014",
    issue_place: "Campanario",
    signer_name: "",
    show_signature: true,
    intro: "",
    cover_image_path: "/images/obras/vivienda-en-villanueva-de-la-serena/01.webp",
    cover_url: "/images/obras/vivienda-en-villanueva-de-la-serena/01.webp",
    status: "borrador",
    created_at: now,
    updated_at: now,
    points: [
      {
        id: "p1",
        dossier_id: "demo",
        position: 0,
        title: "Objeto del informe",
        body: "<p>El objeto de este informe es averiguar el origen de las filtraciones existentes en la cubierta y proponer una solución. Para ello se han realizado pruebas sobre la cubierta durante dos jornadas.</p>",
        image_layout: "grid-2",
        images: [],
      },
      {
        id: "p2",
        dossier_id: "demo",
        position: 1,
        title: "Pruebas realizadas",
        body: "<p>Se han mantenido inundadas varias zonas de la cubierta alrededor de los sumideros, dando esta prueba un resultado negativo.</p><p>Sin embargo, al echar agua con manguera sobre los encuentros con los paramentos verticales sí aparece agua en el forjado inferior, lo que indica que las filtraciones se producen en dichos encuentros.</p>",
        image_layout: "grid-2",
        images: [
          img("p2", 0, "/images/obras/vivienda-en-villanueva-de-la-serena/02.webp", "Prueba de estanqueidad en sumideros"),
          img("p2", 1, "/images/obras/vivienda-en-villanueva-de-la-serena/03.webp", "Encuentro con paramento vertical"),
        ],
      },
      {
        id: "p3",
        dossier_id: "demo",
        position: 2,
        title: "Conclusiones y propuesta de actuación",
        body: "<p>Para solucionar las filtraciones se propone revisar los encuentros con los paramentos verticales y, por motivos de rapidez y garantía del sistema, impermeabilizar toda la superficie con <strong>poliurea proyectada</strong>, sin necesidad de retirar baldosas ni aislamiento.</p>",
        image_layout: "grid-1",
        images: [img("p3", 0, "/images/obras/vivienda-en-villanueva-de-la-serena/04.webp", "Ejemplo de acabado con poliurea")],
      },
    ],
  };
}
