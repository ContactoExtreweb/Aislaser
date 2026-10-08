export type DossierStatus = "borrador" | "terminado";
/** "informe": formato carta del informe técnico de Aislaser · "portada": dosier con portada fotográfica */
export type DossierTemplate = "informe" | "portada";
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
  template: DossierTemplate;
  /** "A/A del técnico" */
  attention: string;
  /** "INFORME REALIZADO POR" */
  prepared_by: string;
  /** Lugar de emisión: "Se emite este informe técnico en …" */
  issue_place: string;
  /** Firmante; vacío = el de Ajustes */
  signer_name: string;
  show_signature: boolean;
  created_at: string;
  updated_at: string;
  points: DossierPoint[];
};

export type DossierFields = Pick<
  Dossier,
  | "title"
  | "subtitle"
  | "client_name"
  | "location"
  | "work_date"
  | "reference"
  | "intro"
  | "status"
  | "template"
  | "attention"
  | "prepared_by"
  | "issue_place"
  | "signer_name"
  | "show_signature"
>;

/** Datos de empresa para el cierre del documento (sello y firma desde Ajustes) */
export type Branding = {
  signerName: string;
  signerCompany: string;
  /** URLs locales (blob:) de las imágenes del bucket privado "firmas", o null */
  stampUrl: string | null;
  signatureUrl: string | null;
};

/** Lo que llega del servidor: rutas privadas, que el navegador descarga con la sesión del usuario */
export type BrandingSource = {
  signerName: string;
  signerCompany: string;
  stampPath: string | null;
  signaturePath: string | null;
};

export const DEFAULT_BRANDING: Branding = {
  signerName: "Isidro Calvo Gallego",
  signerCompany: "AISLASER, C.B.",
  stampUrl: null,
  signatureUrl: null,
};

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
