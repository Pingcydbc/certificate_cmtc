import { createCanvas, loadImage, GlobalFonts, Image } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

let fontsRegistered = false;

export function registerCustomFonts() {
  if (fontsRegistered) return;

  const fontDir = path.join(process.cwd(), 'public', 'fonts');

  const fontsToRegister = [
    { file: 'THSarabunNew.ttf', name: 'TH Sarabun New' },
    { file: 'THSarabunNew-Bold.ttf', name: 'TH Sarabun New' },
    { file: 'Sarabun-Regular.ttf', name: 'Sarabun' },
    { file: 'Sarabun-Bold.ttf', name: 'Sarabun' },
    { file: 'Prompt-Regular.ttf', name: 'Prompt' },
    { file: 'Prompt-Bold.ttf', name: 'Prompt' },
    { file: 'ChakraPetch-Regular.ttf', name: 'Chakra Petch' },
    { file: 'ChakraPetch-Bold.ttf', name: 'Chakra Petch' },
    { file: 'Kanit-Regular.ttf', name: 'Kanit' },
    { file: 'Kanit-Bold.ttf', name: 'Kanit' },
    { file: 'Mali-Regular.ttf', name: 'Mali' },
    { file: 'Mali-Bold.ttf', name: 'Mali' },
    { file: 'Niramit-Regular.ttf', name: 'Niramit' },
    { file: 'Niramit-Bold.ttf', name: 'Niramit' },
  ];

  for (const f of fontsToRegister) {
    const fullPath = path.join(fontDir, f.file);
    if (fs.existsSync(fullPath)) {
      try {
        GlobalFonts.registerFromPath(fullPath, f.name);
      } catch (e) {
        console.warn(`Could not register font ${f.name} from ${fullPath}:`, e);
      }
    }
  }

  fontsRegistered = true;
}

export interface RenderElement {
  id?: string;
  elementType: string; // 'dynamic' | 'static' | 'image' | 'qrcode'
  fieldKey: string; // 'certNumber' | 'fullName' | 'organization' | 'eventDate' | 'customText' | 'image' | 'qrcode'
  defaultValue?: string | null;
  posX: number;
  posY: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  textAlign: string; // 'left' | 'center' | 'right'
  lineHeight: number;
  maxWidth?: number | null;
  fontWeight?: string | null; // 'normal' | 'bold'
  fontStyle?: string | null; // 'normal' | 'italic'
  isUnderline?: boolean | null;
  letterSpacing?: number | null;
  opacity?: number | null;
  width?: number | null; // For image width
  height?: number | null; // For image height
  filterSharpen?: number | null;
  filterBrightness?: number | null;
  filterContrast?: number | null;
  removeWhiteBg?: boolean | null;
}

export interface RenderRecipient {
  id?: string;
  certNumber: string;
  fullName: string;
  organization?: string | null;
  note?: string | null;
  issuedDate?: Date | string;
}

export interface RenderProject {
  id?: string;
  code: string;
  title: string;
  description?: string | null;
  eventDate?: string | null;
  location?: string | null;
}

export interface RenderCertificateParams {
  template: {
    backgroundImage: string;
    width: number;
    height: number;
    elements: RenderElement[];
  };
  recipient: RenderRecipient;
  project: RenderProject;
  scale?: number; // default 1
}

function resolveImagePath(imgPath: string): string {
  if (imgPath.startsWith('/')) {
    return path.join(process.cwd(), 'public', imgPath);
  }
  return imgPath;
}

const MAX_IMAGE_CACHE_SIZE = 40;
const serverImageCache = new Map<string, any>();

function setCachedServerImage(key: string, img: any) {
  if (key.startsWith('data:')) return;
  if (serverImageCache.size >= MAX_IMAGE_CACHE_SIZE) {
    const oldestKey = serverImageCache.keys().next().value;
    if (oldestKey !== undefined) {
      serverImageCache.delete(oldestKey);
    }
  }
  serverImageCache.set(key, img);
}

async function loadServerImage(imgPathOrUrl: string): Promise<any> {
  if (!imgPathOrUrl) return null;

  if (!imgPathOrUrl.startsWith('data:') && serverImageCache.has(imgPathOrUrl)) {
    const cached = serverImageCache.get(imgPathOrUrl);
    // Refresh LRU order
    serverImageCache.delete(imgPathOrUrl);
    serverImageCache.set(imgPathOrUrl, cached);
    return cached;
  }

  if (imgPathOrUrl.startsWith('data:')) {
    try {
      return await loadImage(imgPathOrUrl);
    } catch (e) {
      console.warn('Failed to load data URL:', e);
      return null;
    }
  }

  if (imgPathOrUrl.startsWith('http://') || imgPathOrUrl.startsWith('https://')) {
    try {
      const res = await fetch(imgPathOrUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const img = await loadImage(buf);
        setCachedServerImage(imgPathOrUrl, img);
        return img;
      }
    } catch (e) {
      console.warn(`Failed to fetch remote image ${imgPathOrUrl}:`, e);
      return null;
    }
  }

  const fullImgPath = resolveImagePath(imgPathOrUrl);
  if (fs.existsSync(fullImgPath)) {
    try {
      const img = await loadImage(fullImgPath);
      setCachedServerImage(imgPathOrUrl, img);
      return img;
    } catch (err) {
      console.warn(`Failed to render local image ${fullImgPath}:`, err);
    }
  }

  // If local file wasn't found (e.g. running on Vercel serverless), try fetching via public URL
  if (imgPathOrUrl.startsWith('/')) {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    if (baseUrl) {
      try {
        const fullUrl = `${baseUrl.replace(/\/$/, '')}${imgPathOrUrl}`;
        const res = await fetch(fullUrl);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const img = await loadImage(buf);
          setCachedServerImage(imgPathOrUrl, img);
          return img;
        }
      } catch (e) {
        console.warn(`Failed to fetch relative image via base URL ${imgPathOrUrl}:`, e);
      }
    }
  }

  return null;
}

function parseServerImageMetadata(el: RenderElement) {
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
    } catch (e) {}
  }
  return {
    url: raw,
    removeWhiteBg: Boolean(el.removeWhiteBg),
    sharpenLevel: Number(el.filterSharpen) || 0,
    brightness: Number(el.filterBrightness) || 0,
    contrast: Number(el.filterContrast) || 0,
  };
}

export async function renderCertificateCanvas(params: RenderCertificateParams) {
  registerCustomFonts();

  const { template, recipient, project, scale = 1 } = params;
  const width = Math.round(template.width * scale);
  const height = Math.round(template.height * scale);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Pre-load background and all unique element images in parallel
  const imageMetaByElement = new Map<RenderElement, ReturnType<typeof parseServerImageMetadata>>();
  const uniqueUrls = new Set<string>();
  if (template.backgroundImage) {
    uniqueUrls.add(template.backgroundImage);
  }
  for (const el of template.elements) {
    if (el.elementType === 'image') {
      const meta = parseServerImageMetadata(el);
      imageMetaByElement.set(el, meta);
      if (meta.url) {
        uniqueUrls.add(meta.url);
      }
    }
  }

  const loadedImagesMap = new Map<string, any>();
  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      const img = await loadServerImage(url);
      if (img) {
        loadedImagesMap.set(url, img);
      }
    })
  );

  // Draw Background Image
  const bgImage = template.backgroundImage ? loadedImagesMap.get(template.backgroundImage) : null;

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, width, height);
  } else {
    // Fallback: elegant certificate background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10 * scale;
    ctx.strokeRect(20 * scale, 20 * scale, width - 40 * scale, height - 40 * scale);
  }

  // Draw Elements
  for (const el of template.elements) {
    ctx.save();

    // Set Opacity if specified
    const elemOpacity = el.opacity !== undefined && el.opacity !== null ? el.opacity : 1.0;
    ctx.globalAlpha = Math.max(0, Math.min(1, elemOpacity));

    // 1. Image Element (Logo, Stamp, Signature, PNG/JPG)
    if (el.elementType === 'image') {
      const meta = imageMetaByElement.get(el) || parseServerImageMetadata(el);
      const { url: imgPathOrUrl, removeWhiteBg, sharpenLevel, brightness, contrast } = meta;

      if (imgPathOrUrl) {
        const loadedImg = loadedImagesMap.get(imgPathOrUrl);

        if (loadedImg) {
          const imgW = Math.round((el.width || 120) * scale);
          const imgH = Math.round((el.height || 120) * scale);
          const imgX = Math.round((el.posX - (el.width || 120) / 2) * scale);
          const imgY = Math.round((el.posY - (el.height || 120) / 2) * scale);

          if (removeWhiteBg || sharpenLevel > 0 || brightness !== 0 || contrast !== 0) {
            try {
              const tempCanvas = createCanvas(imgW, imgH);
              const tempCtx = tempCanvas.getContext('2d');
              tempCtx.drawImage(loadedImg, 0, 0, imgW, imgH);
              const imgData = tempCtx.getImageData(0, 0, imgW, imgH);
              const data = imgData.data;

              if (brightness !== 0 || contrast !== 0) {
                const brightnessFactor = Math.max(0, (100 + brightness) / 100);
                const contrastFactor = Math.max(0, (100 + contrast) / 100);
                for (let i = 0; i < data.length; i += 4) {
                  for (let c = 0; c < 3; c++) {
                    const brightened = data[i + c] * brightnessFactor;
                    const contrasted = (brightened - 128) * contrastFactor + 128;
                    data[i + c] = Math.min(255, Math.max(0, contrasted));
                  }
                }
              }

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
                const copy = new Uint8ClampedArray(data);
                for (let y = 1; y < imgH - 1; y++) {
                  for (let x = 1; x < imgW - 1; x++) {
                    const idx = (y * imgW + x) * 4;
                    if (data[idx + 3] > 20) {
                      for (let c = 0; c < 3; c++) {
                        const center = copy[idx + c];
                        const top = copy[((y - 1) * imgW + x) * 4 + c];
                        const bottom = copy[((y + 1) * imgW + x) * 4 + c];
                        const left = copy[(y * imgW + (x - 1)) * 4 + c];
                        const right = copy[(y * imgW + (x + 1)) * 4 + c];
                        const val = center + strength * (4 * center - top - bottom - left - right);
                        data[idx + c] = Math.min(255, Math.max(0, val));
                      }
                    }
                  }
                }
              }

              tempCtx.putImageData(imgData, 0, 0);
              ctx.drawImage(tempCanvas, imgX, imgY, imgW, imgH);
            } catch (procErr) {
              ctx.drawImage(loadedImg, imgX, imgY, imgW, imgH);
            }
          } else {
            ctx.drawImage(loadedImg, imgX, imgY, imgW, imgH);
          }
        }
      }
      ctx.restore();
      continue;
    }

    // 2. QR Code Element (Dynamic Verification)
    if (el.elementType === 'qrcode') {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://certificate-online.vercel.app');
        const recId = recipient.id || '';
        const qrUrl = el.defaultValue ? el.defaultValue.replace(/{certId}/g, recId) : `${baseUrl}/cert/${recId}`;
        const qrBuffer = await QRCode.toBuffer(qrUrl, {
          margin: 1,
          width: Math.round((el.width || 90) * scale),
          color: { dark: '#000000', light: '#ffffff' },
        });
        const qrImg = await loadImage(qrBuffer);
        const qrW = Math.round((el.width || 90) * scale);
        const qrH = Math.round((el.height || 90) * scale);
        const qrX = Math.round((el.posX - (el.width || 90) / 2) * scale);
        const qrY = Math.round((el.posY - (el.height || 90) / 2) * scale);
        ctx.drawImage(qrImg, qrX, qrY, qrW, qrH);
      } catch (err) {
        console.warn('Failed to render QR Code:', err);
      }
      ctx.restore();
      continue;
    }

    // 3. Text Element (Dynamic or Static)
    let text = '';
    if (el.elementType === 'dynamic') {
      if (el.fieldKey === 'certNumber') {
        text = recipient.certNumber || el.defaultValue || '';
      } else if (el.fieldKey === 'fullName') {
        text = recipient.fullName || el.defaultValue || '';
      } else if (el.fieldKey === 'organization') {
        text = recipient.organization || el.defaultValue || '';
      } else if (el.fieldKey === 'note') {
        text = recipient.note || el.defaultValue || '';
      } else if (el.fieldKey === 'eventDate') {
        text = project.eventDate || el.defaultValue || '';
      } else if (el.fieldKey === 'location') {
        text = project.location || el.defaultValue || '';
      } else {
        text = el.defaultValue || '';
      }
    } else {
      text = el.defaultValue || '';
    }

    // Replace dynamic placeholders if present in static text
    text = text
      .replace(/{certNumber}/g, recipient.certNumber || '')
      .replace(/{fullName}/g, recipient.fullName || '')
      .replace(/{organization}/g, recipient.organization || '')
      .replace(/{note}/g, recipient.note || '')
      .replace(/{eventDate}/g, project.eventDate || '')
      .replace(/{location}/g, project.location || '')
      .replace(/{projectTitle}/g, project.title || '');

    if (!text) {
      ctx.restore();
      continue;
    }

    const scaledFontSize = Math.round(el.fontSize * scale);
    const family = el.fontFamily || 'Sarabun';
    const isBold = el.fontWeight === 'bold';
    const isItalic = el.fontStyle === 'italic';

    // Match CertificateCanvas.tsx font string identically
    const stylePrefix = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}`;
    ctx.font = `${stylePrefix}${scaledFontSize}px "${family}", sans-serif`;
    ctx.fillStyle = el.fontColor || '#000000';
    ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'center';
    ctx.textBaseline = 'middle';

    const posX = el.posX * scale;
    const posY = el.posY * scale;
    const lineHeight = (el.lineHeight || 1.4) * scaledFontSize;

    // Handle multiline
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      const lineOffset = (idx - (lines.length - 1) / 2) * lineHeight;
      const currentY = posY + lineOffset;
      ctx.fillText(line, posX, currentY);

      // Handle Underline (matching CertificateCanvas.tsx offset and stroke width)
      if (el.isUnderline) {
        const textMetrics = ctx.measureText(line);
        const textW = textMetrics.width;
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

  return canvas;
}

export async function renderCertificatePng(params: RenderCertificateParams): Promise<Buffer> {
  const canvas = await renderCertificateCanvas(params);
  return canvas.toBuffer('image/png');
}

export async function renderCertificatePdf(params: RenderCertificateParams): Promise<Buffer> {
  // Render PNG at high resolution (scale 2 for print quality)
  const highResCanvas = await renderCertificateCanvas({
    ...params,
    scale: 2,
  });
  const pngBuffer = highResCanvas.toBuffer('image/png');

  const pdfDoc = await PDFDocument.create();
  const embeddedImage = await pdfDoc.embedPng(pngBuffer);

  const pageWidth = 841.89;
  const pageHeight = 595.28;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const imgAspect = embeddedImage.width / embeddedImage.height;
  const pageAspect = pageWidth / pageHeight;

  let drawW = pageWidth;
  let drawH = pageHeight;
  let drawX = 0;
  let drawY = 0;

  if (imgAspect > pageAspect) {
    drawH = pageWidth / imgAspect;
    drawY = (pageHeight - drawH) / 2;
  } else {
    drawW = pageHeight * imgAspect;
    drawX = (pageWidth - drawW) / 2;
  }

  page.drawImage(embeddedImage, {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
