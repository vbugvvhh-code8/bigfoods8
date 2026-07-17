/**
 * Resizes and re-encodes an image in the browser before upload, so large
 * photos from a phone camera don't get rejected for being too big. Targets a
 * max dimension and iteratively lowers JPEG quality until under maxKB (best
 * effort — very busy/detailed photos may not compress below the target at
 * reasonable quality, in which case the smallest attempt is returned).
 */
export async function compressImage(
  file: File,
  { maxDimension = 1280, maxKB = 300 }: { maxDimension?: number; maxKB?: number } = {}
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.85;
  let blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

  while (blob && blob.size / 1024 > maxKB && quality > 0.3) {
    quality -= 0.15;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  }

  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}
