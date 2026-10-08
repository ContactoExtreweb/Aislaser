export type DossierStatus = "borrador" | "terminado";
export type ImageLayout = "grid-1" | "grid-2" | "grid-3";

export type DossierImage = {
  id: string;
  dossier_id: string;
  point_id: string;
  storage_path: string;
  caption: string;
  position: number;
  width: number | null;
  height: number | null;
  /** URL para mostrarla (pública de Storage o blob: en modo demo) */
  url: string;
};

export type DossierPoint = {
  id: string;
  dossier_id: string;
  position: number;
  title: string;
  body: string;
  image_layout: ImageLayout;
  images: DossierImage[];
};

export type Dossier = {
  id: string;
  title: string;
  subtitle: string;
  client_name: string;
  location: string;
  work_date: string | null;
  reference: string;
  intro: string;
  cover_image_path: string | null;
  cover_url: string | null;
  status: DossierStatus;
  created_at: string;
  updated_at: string;
  points: DossierPoint[];
};

export type DossierFields = Pick<
  Dossier,
  "title" | "subtitle" | "client_name" | "location" | "work_date" | "reference" | "intro" | "status"
>;

export type PointFields = Pick<DossierPoint, "title" | "body" | "image_layout">;

export type UploadedImage = { path: string; url: string; width: number; height: number };

/** Operaciones de guardado del editor (Supabase o modo demostración en memoria) */
export interface DossierRepo {
  updateDossier(id: string, patch: Partial<DossierFields>): Promise<void>;
  setCover(dossier: Dossier, file: Blob, size: { width: number; height: number }): Promise<UploadedImage>;
  removeCover(dossier: Dossier): Promise<void>;
  addPoint(dossierId: string, position: number): Promise<DossierPoint>;
  updatePoint(id: string, patch: Partial<PointFields>): Promise<void>;
  deletePoint(point: DossierPoint): Promise<void>;
  reorderPoints(items: { id: string; position: number }[]): Promise<void>;
  addImage(point: DossierPoint, file: Blob, size: { width: number; height: number }, position: number): Promise<DossierImage>;
  updateImage(id: string, patch: { caption?: string }): Promise<void>;
  deleteImage(image: DossierImage): Promise<void>;
  reorderImages(items: { id: string; position: number }[]): Promise<void>;
}
