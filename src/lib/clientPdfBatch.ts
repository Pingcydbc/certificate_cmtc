'use client';

import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { resolveCertificateElementText } from '@/lib/templateHelpers';
import { ensureCertificateFontsLoaded } from '@/lib/browserFonts';

export interface BatchTemplateElement {
  id: string;
  elementType: string;
  fieldKey: string;
  defaultValue?: string | null;
  posX: number;
  posY: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  textAlign: string;
  lineHeight: number;
  maxWidth?: number | null;
  fontWeight?: string | null;
  fontStyle?: string | null;
  isUnderline?: boolean | null;
  letterSpacing?: number | null;
  opacity?: number | null;
  width?: number | null;
  height?: number | null;
  filterSharpen?: number | null;
  filterBrightness?: number | null;
  filterContrast?: number | null;
  removeWhiteBg?: boolean | null;
}

export interface BatchCertificateData {
  project: {
    id: string;
    code: string;
    title: string;
    eventDate?: string | null;
    location?: string | null;
  };
  template: {
    backgroundImage: string;
    width: number;
    height: number;
    elements: BatchTemplateElement[];
  };
  recipients: Array<{
    id: string;
    nationalId?: string | null;
    certNumber: string;
    fullName: string;
    organization?: string | null;
    trainingLocation?: string | null;
    trainingDate?: string | null;
    signedDate?: string | null;
    note?: string | null;
  }>;
}

function loadImageElement(src: string, useCors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function loadCanvasSafeImage(src: string, projectId: string): Promise<HTMLImageElement | null> {
  if (!src) return null;

  if (src.startsWith('data:') || src.startsWith('/')) {
    try {
      return await loadImageElement(src, false);
    } catch {
      return null;
    }
  }

  // Remote URL: try CORS first, then fallback to same-origin authenticated proxy
  try {
    return await loadImageElement(src, true);
  } catch {
    try {
      const proxyUrl = `/api/certificates/asset?projectId=${encodeURIComponent(projectId)}&url=${encodeURIComponent(src)}`;
      return await loadImageElement(proxyUrl, false);
    } catch {
      return null;
    }
  }
}

function parseImageElementMeta(el: BatchTemplateElement) {
  const raw = el.defaultValue || '';
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        url: String(parsed.url || ''),
        removeWhiteBg: parsed.removeWhiteBg !== undefined ? Boolean(parsed.removeWhiteBg) : Boolean(el.removeWhiteBg),
        sharpenLevel: parsed.sharpen !== undefined ? Number(parsed.sharpen) || 0 : Number(el.filterSharpen) || 0,
        brightness: parsed.brightness !== undefined ? Number(parsed.brightness) || 0 : Number(el.filterBrightness) || 0,
        contrast: parsed.contrast !== undefined ? Number(parsed.contrast) || 0 : Number(el.filterContrast) || 0,
      };
    } catch {}
  }
  return {
    url: raw,
    removeWhiteBg: Boolean(el.removeWhiteBg),
    sharpenLevel: Number(el.filterSharpen) || 0,
    brightness: Number(el.filterBrightness) || 0,
    contrast: Number(el.filterContrast) || 0,
  };
}

function createProcessedImageCanvas(
  rawImg: HTMLImageElement,
  removeWhiteBg: boolean,
  sharpenLevel: number,
  brightness: number,
  contrast: number
): HTMLCanvasElement | HTMLImageElement {
  if (!removeWhiteBg && !sharpenLevel && !brightness && !contrast) {
    return rawImg;
  }

  const off = document.createElement('canvas');
  off.width = rawImg.naturalWidth || rawImg.width;
  off.height = rawImg.naturalHeight || rawImg.height;
  const ctx = off.getContext('2d');
  if (!ctx) return rawImg;

  if (brightness !== 0 || contrast !== 0) {
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;
  }
  ctx.drawImage(rawImg, 0, 0);

  if (removeWhiteBg || sharpenLevel > 0) {
    try {
      const imgData = ctx.getImageData(0, 0, off.width, off.height);
      const data = imgData.data;

      if (removeWhiteBg) {
        for (let i = 0; i < data.length; i += 4) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum > 220) {
            data[i + 3] = 0;
          } else if (lum > 180) {
            data[i + 3] = Math.round(data[i + 3] * ((220 - lum) / 40));
          }
        }
      }

      if (sharpenLevel > 0) {
        const strength = (sharpenLevel / 100) * 0.75;
        const w = off.width;
        const h = off.height;
        const copy = new Uint8ClampedArray(data);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] > 20) {
              for (let c = 0; c < 3; c++) {
                const center = copy[idx + c];
                const top = copy[((y - 1) * w + x) * 4 + c];
                const bottom = copy[((y + 1) * w + x) * 4 + c];
                const left = copy[(y * w + (x - 1)) * 4 + c];
                const right = copy[(y * w + (x + 1)) * 4 + c];
                const val = center + strength * (4 * center - top - bottom - left - right);
                data[idx + c] = Math.min(255, Math.max(0, val));
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch {
      return rawImg;
    }
  }

  return off;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export async function generateBatchCertificatePdf(
  data: BatchCertificateData,
  options: {
    onProgress?: (current: number, total: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<Uint8Array> {
  const { project, template, recipients } = data;
  const { onProgress, signal } = options;

  await ensureCertificateFontsLoaded(template.elements);

  const scale = 2;
  const baseW = template.width || 990;
  const baseH = template.height || 698;
  const canvasW = Math.round(baseW * scale);
  const canvasH = Math.round(baseH * scale);

  // Pre-load background + unique element images once
  const uniqueUrls = new Set<string>();
  if (template.backgroundImage) uniqueUrls.add(template.backgroundImage);

  const imageMetaMap = new Map<string, ReturnType<typeof parseImageElementMeta>>();
  for (const el of template.elements) {
    if (el.elementType === 'image') {
      const meta = parseImageElementMeta(el);
      imageMetaMap.set(el.id, meta);
      if (meta.url) uniqueUrls.add(meta.url);
    }
  }

  const loadedRawImages = new Map<string, HTMLImageElement>();
  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      const img = await loadCanvasSafeImage(url, project.id);
      if (img) loadedRawImages.set(url, img);
    })
  );

  // Pre-process filtered images once per element
  const processedImagesByElId = new Map<string, HTMLCanvasElement | HTMLImageElement>();
  for (const el of template.elements) {
    if (el.elementType === 'image') {
      const meta = imageMetaMap.get(el.id);
      if (meta?.url) {
        const raw = loadedRawImages.get(meta.url);
        if (raw) {
          processedImagesByElId.set(
            el.id,
            createProcessedImageCanvas(raw, meta.removeWhiteBg, meta.sharpenLevel, meta.brightness, meta.contrast)
          );
        }
      }
    }
  }

  const bgImage = template.backgroundImage ? loadedRawImages.get(template.backgroundImage) : null;
  const hasQr = template.elements.some((el) => el.elementType === 'qrcode');
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://certificate-online.vercel.app';

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง Canvas สำหรับสร้าง PDF ได้');
  }

  const pdfDoc = await PDFDocument.create();
  const imgAspect = canvasW / canvasH;
  const isLandscape = imgAspect >= 1;
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;
  const pageAspect = pageWidth / pageHeight;

  let drawW = pageWidth;
  let drawH = pageHeight;
  let drawX = 0;
  let drawY = 0;
  if (Math.abs(imgAspect - pageAspect) > 0.03) {
    if (imgAspect > pageAspect) {
      drawH = pageHeight;
      drawW = pageHeight * imgAspect;
      drawX = (pageWidth - drawW) / 2;
    } else {
      drawW = pageWidth;
      drawH = pageWidth / imgAspect;
      drawY = (pageHeight - drawH) / 2;
    }
  }

  for (let rIdx = 0; rIdx < recipients.length; rIdx++) {
    if (signal?.aborted) {
      throw new DOMException('Cancelled', 'AbortError');
    }

    const recipient = recipients[rIdx];
    ctx.clearRect(0, 0, canvasW, canvasH);

    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvasW, canvasH);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    for (const el of template.elements) {
      ctx.save();
      const elemOpacity = el.opacity !== undefined && el.opacity !== null ? el.opacity : 1.0;
      ctx.globalAlpha = Math.max(0, Math.min(1, elemOpacity));

      if (el.elementType === 'image') {
        const procImg = processedImagesByElId.get(el.id);
        if (procImg) {
          const imgW = Math.round((el.width || 120) * scale);
          const imgH = Math.round((el.height || 120) * scale);
          const imgX = Math.round((el.posX - (el.width || 120) / 2) * scale);
          const imgY = Math.round((el.posY - (el.height || 120) / 2) * scale);
          ctx.drawImage(procImg, imgX, imgY, imgW, imgH);
        }
        ctx.restore();
        continue;
      }

      if (el.elementType === 'qrcode' && hasQr) {
        try {
          const qrUrl = el.defaultValue
            ? el.defaultValue.replace(/{certId}/g, recipient.id)
            : `${originUrl}/cert/${recipient.id}`;
          const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            margin: 1,
            width: Math.round((el.width || 90) * scale),
            color: { dark: '#000000', light: '#ffffff' },
          });
          const qrImg = await loadImageElement(qrDataUrl, false);
          const qrW = Math.round((el.width || 90) * scale);
          const qrH = Math.round((el.height || 90) * scale);
          const qrX = Math.round((el.posX - (el.width || 90) / 2) * scale);
          const qrY = Math.round((el.posY - (el.height || 90) / 2) * scale);
          ctx.drawImage(qrImg, qrX, qrY, qrW, qrH);
        } catch {}
        ctx.restore();
        continue;
      }

      // Text Element
      const text = resolveCertificateElementText(el, recipient, project);

      if (!text) {
        ctx.restore();
        continue;
      }

      const scaledFontSize = Math.round(el.fontSize * scale);
      const family = el.fontFamily || 'Sarabun';
      const isBold = el.fontWeight === 'bold';
      const isItalic = el.fontStyle === 'italic';
      const stylePrefix = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}`;

      ctx.font = `${stylePrefix}${scaledFontSize}px "${family}", sans-serif`;
      ctx.fillStyle = el.fontColor || '#000000';
      ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';

      const posX = el.posX * scale;
      const posY = el.posY * scale;
      const lineHeight = (el.lineHeight || 1.4) * scaledFontSize;
      const lines = text.split('\n');

      lines.forEach((line, idx) => {
        const lineOffset = (idx - (lines.length - 1) / 2) * lineHeight;
        const currentY = posY + lineOffset;
        ctx.fillText(line, posX, currentY);

        if (el.isUnderline) {
          const textW = ctx.measureText(line).width;
          let startX = posX;
          if (ctx.textAlign === 'center') startX = posX - textW / 2;
          else if (ctx.textAlign === 'right') startX = posX - textW;

          const underlineY = currentY + scaledFontSize * 0.45;
          ctx.strokeStyle = el.fontColor || '#000000';
          ctx.lineWidth = Math.max(1, scaledFontSize * 0.06);
          ctx.beginPath();
          ctx.moveTo(startX, underlineY);
          ctx.lineTo(startX + textW, underlineY);
          ctx.stroke();
        }
      });

      ctx.restore();
    }

    const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const jpgBytes = dataUrlToUint8Array(jpgDataUrl);
    const embeddedImage = await pdfDoc.embedJpg(jpgBytes);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });

    onProgress?.(rIdx + 1, recipients.length);

    // Yield to browser UI thread so progress bar updates smoothly
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return await pdfDoc.save();
}
