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

export function demoDossier(): Dossier {
  const now = new Date().toISOString();
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
  return {
    id: "demo",
    title: "Impermeabilización de cubierta con poliurea",
    subtitle: "Dosier técnico de ejecución",
    client_name: "Cliente de ejemplo S.L.",
    location: "Villanueva de la Serena (Badajoz)",
    work_date: now.slice(0, 10),
    reference: "OBR-2026-014",
    intro:
      "<p>El presente dosier recoge el proceso de <strong>impermeabilización con poliurea proyectada</strong> de la cubierta, desde el estado inicial del soporte hasta el acabado final.</p>",
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
        title: "Estado inicial de la cubierta",
        body: "<p>Se realiza una inspección visual de la cubierta, detectando fisuras en la impermeabilización existente y filtraciones en varios puntos.</p><ul><li>Fisuras en juntas perimetrales.</li><li>Desprendimientos de la lámina antigua.</li></ul>",
        image_layout: "grid-2",
        images: [
          img("p1", 0, "/images/obras/vivienda-en-villanueva-de-la-serena/02.webp", "Vista general antes de la intervención"),
          img("p1", 1, "/images/obras/vivienda-en-villanueva-de-la-serena/03.webp", "Detalle de las juntas"),
        ],
      },
      {
        id: "p2",
        dossier_id: "demo",
        position: 1,
        title: "Aplicación de la poliurea",
        body: "<p>Tras la limpieza y preparación del soporte, se proyecta la membrana de poliurea en caliente, formando una capa continua y sin juntas.</p>",
        image_layout: "grid-1",
        images: [img("p2", 0, "/images/obras/vivienda-en-villanueva-de-la-serena/04.webp", "Membrana de poliurea terminada")],
      },
    ],
  };
}
