import { upload as uploadToVercelBlob } from '@vercel/blob/client';

export interface UploadImageResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

export interface OptimizeImageOptions {
  mode: 'background' | 'element';
  maxBytes?: number;
}

interface UploadCapabilities {
  blobEnabled: boolean;
  isServerless: boolean;
}

let cachedCapabilities: UploadCapabilities | null = null;

async function getUploadCapabilities(): Promise<UploadCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;

  try {
    const res = await fetch('/api/upload/blob', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      cachedCapabilities = {
        blobEnabled: Boolean(data.blobEnabled),
        isServerless: Boolean(data.isServerless),
      };
      return cachedCapabilities;
    }
  } catch {
    // Assume serverless without blob as the safest fallback
  }

  return { blobEnabled: false, isServerless: true };
}

/**
 * Safely parses a fetch Response as JSON, gracefully handling plain-text/HTML
 * gateway errors such as Vercel's 413 "Request Entity Too Large".
 */
export async function safeReadJsonResponse<T = Record<string, any>>(
  res: Response
): Promise<T & { success?: boolean; error?: string }> {
  const text = await res.text();
  if (!text) {
    if (res.status === 413) {
      return {
        success: false,
        error: 'ขนาดไฟล์หรือข้อมูลใหญ่เกินขีดจำกัดของเซิร์ฟเวอร์ (413) กรุณาลดขนาดรูปภาพแล้วลองใหม่อีกครั้ง',
      } as T & { success?: boolean; error?: string };
    }
    return {
      success: res.ok,
      error: res.ok ? undefined : `เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${res.status})`,
    } as T & { success?: boolean; error?: string };
  }

  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413 || /request entity too large|content too large/i.test(text)) {
      return {
        success: false,
        error: 'ขนาดไฟล์หรือข้อมูลใหญ่เกินขีดจำกัดของเซิร์ฟเวอร์ (413) กรุณาลดขนาดรูปภาพแล้วลองใหม่อีกครั้ง',
      } as T & { success?: boolean; error?: string };
    }
    return {
      success: false,
      error: `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${res.status})`,
    } as T & { success?: boolean; error?: string };
  }
}

function replaceFileExtension(filename: string, newExt: string): string {
  const dotIdx = filename.lastIndexOf('.');
  const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  return `${base}${newExt}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function loadImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      el.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

function hasTransparentPixels(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      return true;
    }
  }
  return false;
}

/**
 * Keeps original image files untouched whenever they fit safely within the
 * serverless Base64 payload budget (<= 2.2 MB for backgrounds, <= 500 KB for elements).
 * Larger files are compressed at near-lossless quality (JPEG 0.96 first) so
 * print/PDF sharpness stays crisp without triggering Vercel's 413 payload limit.
 */
export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const maxDim = options.mode === 'background' ? 2400 : 1200;
  const maxBytes = options.maxBytes ?? (options.mode === 'background' ? 2_200_000 : 500_000);
  const supportedOriginal = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);

  // If the original file already fits safely within the serverless limit, keep it 100% untouched
  if (file.size <= maxBytes && supportedOriginal) {
    return file;
  }

  let loaded: Awaited<ReturnType<typeof loadImageSource>> | null = null;
  try {
    loaded = await loadImageSource(file);
    const { source, width, height } = loaded;
    const longestSide = Math.max(width, height);

    const initialScale = longestSide > maxDim ? maxDim / longestSide : 1;
    const targetW = Math.max(1, Math.round(width * initialScale));
    const targetH = Math.max(1, Math.round(height * initialScale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    let preserveTransparency = false;
    if (options.mode === 'element' && (file.type === 'image/png' || file.type === 'image/webp')) {
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(source, 0, 0, targetW, targetH);
      preserveTransparency = hasTransparentPixels(ctx, targetW, targetH);
    }

    let bestBlob: Blob | null = null;

    if (preserveTransparency) {
      for (const dimFactor of [1, 0.8, 0.65, 0.5, 0.38]) {
        const w = Math.max(1, Math.round(targetW * dimFactor));
        const h = Math.max(1, Math.round(targetH * dimFactor));
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0, w, h);
        const blob = await canvasToBlob(canvas, 'image/png');
        if (blob) {
          bestBlob = blob;
          if (blob.size <= maxBytes) break;
        }
      }
    } else {
      const renderJpeg = async (
        w: number,
        h: number,
        qualities: number[]
      ): Promise<{ blob: Blob | null; fits: boolean }> => {
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0, w, h);

        let lastBlob: Blob | null = null;
        for (const q of qualities) {
          const blob = await canvasToBlob(canvas, 'image/jpeg', q);
          if (blob) {
            lastBlob = blob;
            if (blob.size <= maxBytes) return { blob, fits: true };
          }
        }
        return { blob: lastBlob, fits: false };
      };

      // Start at 0.96 (near-lossless) to keep certificate backgrounds razor-sharp
      const initialResult = await renderJpeg(targetW, targetH, [0.96, 0.93, 0.89, 0.84]);
      bestBlob = initialResult.blob;
      if (!initialResult.fits) {
        for (const dimFactor of [0.82, 0.65]) {
          const w = Math.max(1, Math.round(targetW * dimFactor));
          const h = Math.max(1, Math.round(targetH * dimFactor));
          const attempt = await renderJpeg(w, h, [0.9, 0.82, 0.72]);
          if (attempt.blob) bestBlob = attempt.blob;
          if (attempt.fits) break;
        }
      }
    }

    if (!bestBlob) return file;

    if (bestBlob.size >= file.size && file.size <= maxBytes) {
      return file;
    }

    const ext = bestBlob.type === 'image/png' ? '.png' : '.jpg';
    return new File([bestBlob], replaceFileExtension(file.name, ext), {
      type: bestBlob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    loaded?.cleanup();
  }
}

export async function uploadOptimizedImage(
  file: File,
  mode: 'background' | 'element'
): Promise<UploadImageResult> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      success: false,
      error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้น',
    };
  }

  const caps = await getUploadCapabilities();

  // 1. If Vercel Blob is configured, upload the 100% original file directly (zero compression)
  if (caps.blobEnabled) {
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.png';
      const blob = await uploadToVercelBlob(`uploads/${Date.now()}_${cleanName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/blob',
      });
      return {
        success: true,
        url: blob.url,
        filename: cleanName,
      };
    } catch (blobErr) {
      console.warn('Direct Vercel Blob upload failed, falling back to /api/upload:', blobErr);
    }
  }

  // 2. Local / Docker disk storage supports original files directly without Base64 overhead
  const fileToUpload = caps.isServerless
    ? await optimizeImageForUpload(file, { mode })
    : file;

  const fd = new FormData();
  fd.append('file', fileToUpload);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: fd,
  });

  return safeReadJsonResponse<UploadImageResult>(res);
}

export function formatImageLabel(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) {
    const approxKb = Math.max(1, Math.round((url.length * 0.75) / 1024));
    return `รูปภาพที่อัปโหลด (${approxKb.toLocaleString()} KB)`;
  }
  return url;
}
