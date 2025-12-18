/**
 * Image compression utility for reducing memory usage and speeding up uploads.
 * Automatically resizes large images and compresses quality.
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1600,
  quality: 0.8,
  mimeType: 'image/jpeg',
};

/**
 * Compress and resize an image from a data URL
 */
export async function compressImage(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const { width, height } = calculateDimensions(
          img.naturalWidth,
          img.naturalHeight,
          opts.maxWidth!,
          opts.maxHeight!
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Use better image smoothing for downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL(opts.mimeType, opts.quality);
        resolve(compressedDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Compress and resize an image from a Blob/File
 */
export async function compressImageBlob(
  blob: Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const dataUrl = await blobToDataUrl(blob);
  const compressedDataUrl = await compressImage(dataUrl, options);
  return dataUrlToBlob(compressedDataUrl);
}

/**
 * Compress and resize an image from a File input
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; blob: Blob }> {
  const dataUrl = await fileToDataUrl(file);
  const compressedDataUrl = await compressImage(dataUrl, options);
  const blob = await dataUrlToBlob(compressedDataUrl);
  return { dataUrl: compressedDataUrl, blob };
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Only resize if image exceeds max dimensions
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width, height };
}

/**
 * Convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((res) => res.blob());
}

/**
 * Get estimated file size from data URL (in KB)
 */
export function getDataUrlSizeKB(dataUrl: string): number {
  // Remove data URL prefix and calculate base64 size
  const base64 = dataUrl.split(',')[1] || '';
  const bytes = (base64.length * 3) / 4;
  return Math.round(bytes / 1024);
}

/**
 * Quick check if compression is needed (file > threshold KB)
 */
export function needsCompression(dataUrl: string, thresholdKB: number = 500): boolean {
  return getDataUrlSizeKB(dataUrl) > thresholdKB;
}
