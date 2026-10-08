"use client";

const MAX_SIDE = 2400;

const isHeic = (file: File | Blob) => /^image\/hei[cf]/.test(file.type) || ("name" in file && /\.hei[cf]$/i.test(file.name));

async function decode(file: File | Blob): Promise<ImageBitmap> {
  try {
    // Gira la imagen según su orientación EXIF (las fotos del móvil en vertical)
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const name = "name" in file && file.name ? `«${file.name}»` : "La foto";
    if (!isHeic(file)) throw new Error(`${name} no es una imagen que se pueda leer.`);
    // Safari lee las fotos HEIC del iPhone; Chrome y Firefox no: el conversor sólo se descarga en ese caso
    try {
      const { heicTo } = await import("heic-to");
      return await heicTo({ blob: file, type: "bitmap" });
    } catch {
      throw new Error(`${name} (HEIC) no se ha podido convertir. Prueba a guardarla como JPG.`);
    }
  }
}

/**
 * Prepara una foto para subirla: corrige la orientación, la reduce si es enorme
 * (las de móvil pueden pesar 10 MB) y la convierte a JPEG de buena calidad.
 */
export async function prepareImage(
  file: File | Blob,
  { format = "jpeg", maxSide = MAX_SIDE, quality = 0.86 }: { format?: "jpeg" | "png"; maxSide?: number; quality?: number } = {},
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await decode(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // En PNG (sello y firma) se conserva la transparencia; en JPEG el fondo queda blanco
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))),
      format === "png" ? "image/png" : "image/jpeg",
      quality,
    ),
  );
  return { blob, width, height };
}

export function imageFilesFrom(list: FileList | DataTransferItemList | File[] | null | undefined): File[] {
  if (!list) return [];
  const files: File[] = [];
  for (const item of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const file = item instanceof File ? item : item.kind === "file" ? item.getAsFile() : null;
    if (file && (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))) files.push(file);
  }
  return files;
}
