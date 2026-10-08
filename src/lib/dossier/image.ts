"use client";

const MAX_SIDE = 2400;

/**
 * Prepara una foto para subirla: corrige la orientación, la reduce si es enorme
 * (las de móvil pueden pesar 10 MB) y la convierte a JPEG de buena calidad.
 */
export async function prepareImage(
  file: File | Blob,
  { format = "jpeg", maxSide = MAX_SIDE }: { format?: "jpeg" | "png"; maxSide?: number } = {},
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
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
      0.86,
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
