import sharp from 'sharp';
import { getStorage, UploadResult, normalize } from '@insertflow/lib';

export interface OptimizeImageOptions {
  orgId: string;
  productName: string;
  originalBuffer: Buffer;
  originalFormat: string;
}

export async function optimizeImage(
  options: OptimizeImageOptions
): Promise<UploadResult & { width: number; height: number; size: number }> {
  const { orgId, productName, originalBuffer, originalFormat } = options;
  const storage = getStorage();

  const normalizedName = normalize(productName);
  const basePath = `org-${orgId}/products/${normalizedName}`;

  // Get metadata
  const metadata = await sharp(originalBuffer).metadata();

  // 1. Save original
  const originalPath = `${basePath}/original.${originalFormat}`;
  await storage.upload(originalBuffer, originalPath, `image/${originalFormat}`);

  // 2. Create optimized version (800x900 com fundo branco)
  const optimizedBuffer = await sharp(originalBuffer)
    .resize(800, 900, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 85 })
    .toBuffer();

  const optimizedPath = `${basePath}/optimized.webp`;
  await storage.upload(optimizedBuffer, optimizedPath, 'image/webp');

  // 3. Create thumbnail (200x200)
  const thumbBuffer = await sharp(originalBuffer)
    .resize(200, 200, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbPath = `${basePath}/thumb.webp`;
  await storage.upload(thumbBuffer, thumbPath, 'image/webp');

  return {
    original: originalPath,
    optimized: optimizedPath,
    thumb: thumbPath,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: originalBuffer.length,
  };
}
