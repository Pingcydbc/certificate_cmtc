'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Move,
  Type,
  Plus,
  Trash2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  Sliders,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Image as ImageIcon,
  Upload,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  Sparkles,
  Magnet,
  Copy,
  Crosshair,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignEndVertical,
  Undo2,
  Redo2,
  ClipboardPaste,
  Edit3,
  Check,
  X,
  QrCode,
  Grid,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Scissors,
  Wand2,
  Maximize2,
  HelpCircle,
  FileCheck
} from 'lucide-react';

export interface CanvasElement {
  id: string;
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
  width?: number | null; // For image / qrcode width
  height?: number | null; // For image / qrcode height
  isLocked?: boolean | null;
  filterSharpen?: number | null; // 0, 25, 50, 100
  filterBrightness?: number | null; // -50 to +50
  filterContrast?: number | null; // -50 to +50
  removeWhiteBg?: boolean | null;
}

interface CertificateCanvasProps {
  backgroundImage: string;
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onSaveImmediately?: (elements: CanvasElement[]) => void;
  width?: number;
  height?: number;
  sampleData?: {
    certNumber?: string;
    fullName?: string;
    organization?: string;
    note?: string;
    eventDate?: string;
    location?: string;
  };
}

export type ResizeHandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'w' | 'e';

interface ElementBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

interface ElementFrame {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  handles: Record<ResizeHandleType, { x: number; y: number; cursor: string }>;
}

interface ResizeState {
  handle: ResizeHandleType;
  startX: number;
  startY: number;
  centerX: number;
  centerY: number;
  initialDist: number;
  initialFontSize: number;
  initialWidth: number;
  initialHeight: number;
}

const PRESET_COLORS = [
  '#000000',
  '#0f172a',
  '#334155',
  '#9f1239', // CMTC Crimson
  '#b45309', // Warm amber
  '#0284c7', // Sky
  '#16a34a', // Emerald
  '#d97706', // Gold
  '#ffffff', // White
];

const THAI_FONTS = [
  { name: 'Sarabun (ทางการ อาชีวะ/กระทรวง)', value: 'Sarabun' },
  { name: 'TH Sarabun New (สารบรรณทางการ)', value: 'TH Sarabun New' },
  { name: 'Prompt (โมเดิร์น สวยงาม)', value: 'Prompt' },
  { name: 'Chakra Petch (หัวเหลี่ยม เทคโนโลยี)', value: 'Chakra Petch' },
  { name: 'Kanit (เรียบหรู ร่วมสมัย)', value: 'Kanit' },
  { name: 'Mali (ลายมือ อ่อนหวาน)', value: 'Mali' },
  { name: 'Niramit (มาตรฐาน กึ่งทางการ)', value: 'Niramit' },
];

export function parseImageMetadata(el: CanvasElement): {
  url: string;
  sharpen: number;
  removeWhiteBg: boolean;
  brightness: number;
  contrast: number;
} {
  const raw = el.defaultValue || '';
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || '',
        sharpen: parsed.sharpen !== undefined ? Number(parsed.sharpen) : (el.filterSharpen || 0),
        removeWhiteBg: parsed.removeWhiteBg !== undefined ? Boolean(parsed.removeWhiteBg) : (el.removeWhiteBg || false),
        brightness: parsed.brightness !== undefined ? Number(parsed.brightness) : (el.filterBrightness || 0),
        contrast: parsed.contrast !== undefined ? Number(parsed.contrast) : (el.filterContrast || 0),
      };
    } catch (e) {}
  }
  return {
    url: raw,
    sharpen: el.filterSharpen || 0,
    removeWhiteBg: el.removeWhiteBg || false,
    brightness: el.filterBrightness || 0,
    contrast: el.filterContrast || 0,
  };
}

export function encodeImageMetadata(
  url: string,
  sharpen: number,
  removeWhiteBg: boolean,
  brightness: number = 0,
  contrast: number = 0
): string {
  if (!sharpen && !removeWhiteBg && !brightness && !contrast) {
    return url;
  }
  return JSON.stringify({
    url,
    sharpen,
    removeWhiteBg,
    brightness,
    contrast,
  });
}

export default function CertificateCanvas({
  backgroundImage,
  elements,
  onElementsChange,
  onSaveImmediately,
  width = 990,
  height = 698,
  sampleData = {
    certNumber: 'NSDV-2569-ผจร.0001',
    fullName: 'นายสุรศักดิ์ ยะกัน',
    organization: 'วิทยาลัยเทคนิคเชียงใหม่',
    eventDate: '12-14 พฤษภาคม 2569',
    location: 'วิทยาลัยเทคนิคเชียงใหม่',
  },
}: CertificateCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Tool Palette Tab: 'inspector' | 'text' | 'image' | 'qrcode' | 'layers'
  const [activeTab, setActiveTab] = useState<'inspector' | 'text' | 'image' | 'qrcode' | 'layers'>('text');

  const [selectedId, setSelectedId] = useState<string | null>(elements[0]?.id || null);

  // Auto-switch to inspector tab when user clicks or selects an element
  useEffect(() => {
    if (selectedId) {
      setActiveTab('inspector');
    }
  }, [selectedId]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cursorStyle, setCursorStyle] = useState<string>('default');

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aspectLocked, setAspectLocked] = useState(true);

  // Smart Guides, Snapping, and Grid
  const [enableSnap, setEnableSnap] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [activeGuides, setActiveGuides] = useState<{
    verticalCenter: boolean;
    horizontalCenter: boolean;
  }>({ verticalCenter: false, horizontalCenter: false });

  // Shift-constrained Dragging
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elemOriginPosRef = useRef<{ posX: number; posY: number }>({ posX: 0, posY: 0 });
  const dragAxisRef = useRef<'free' | 'horizontal' | 'vertical'>('free');
  const [isShiftActive, setIsShiftActive] = useState(false);

  // Undo / Redo
  const historyRef = useRef<CanvasElement[][]>([]);
  const redoHistoryRef = useRef<CanvasElement[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const dragSnapshotRef = useRef<CanvasElement[] | null>(null);

  const pushHistory = useCallback((prevElements: CanvasElement[]) => {
    historyRef.current = [
      ...historyRef.current.slice(-29),
      JSON.parse(JSON.stringify(prevElements)),
    ];
    redoHistoryRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    redoHistoryRef.current.push(JSON.parse(JSON.stringify(elements)));
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
    onElementsChange(prev);
    if (onSaveImmediately) onSaveImmediately(prev);
    showToast('ย้อนกลับแล้ว (Ctrl+Z)');
  }, [elements, onElementsChange, onSaveImmediately]);

  const handleRedo = useCallback(() => {
    if (redoHistoryRef.current.length === 0) return;
    const next = redoHistoryRef.current.pop()!;
    historyRef.current.push(JSON.parse(JSON.stringify(elements)));
    setCanUndo(true);
    setCanRedo(redoHistoryRef.current.length > 0);
    onElementsChange(next);
    if (onSaveImmediately) onSaveImmediately(next);
    showToast('ทำซ้ำแล้ว (Ctrl+Y)');
  }, [elements, onElementsChange, onSaveImmediately]);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  }, []);

  // Clipboard for Copy / Paste
  const clipboardRef = useRef<CanvasElement | null>(null);

  const handleCopy = useCallback(() => {
    if (!selectedId) return;
    const el = elements.find((x) => x.id === selectedId);
    if (!el) return;
    clipboardRef.current = JSON.parse(JSON.stringify(el));
    showToast(`คัดลอก ${el.elementType === 'image' ? 'รูปภาพ' : el.elementType === 'qrcode' ? 'QR Code' : 'ข้อความ'} แล้ว (Ctrl+C)`);
  }, [elements, selectedId, showToast]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) return;
    const copied = clipboardRef.current;
    pushHistory(elements);
    const newId = `${copied.elementType}_${Date.now()}`;
    const pasted: CanvasElement = {
      ...copied,
      id: newId,
      posX: Math.min(width - 40, copied.posX + 25),
      posY: Math.min(height - 40, copied.posY + 25),
    };
    const nextElements = [...elements, pasted];
    onElementsChange(nextElements);
    setSelectedId(newId);
    if (onSaveImmediately) onSaveImmediately(nextElements);
    showToast(`วาง ${pasted.elementType === 'image' ? 'รูปภาพ' : pasted.elementType === 'qrcode' ? 'QR Code' : 'ข้อความ'} แล้ว (Ctrl+V)`);
  }, [elements, onElementsChange, onSaveImmediately, pushHistory, showToast, width, height]);

  // In-Place Inline Text Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const inlineTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const startInlineEditing = useCallback((el: CanvasElement) => {
    if (el.elementType === 'image' || el.elementType === 'qrcode') return;
    setEditingId(el.id);
    setSelectedId(el.id);
    const initialText = el.defaultValue ?? (el.elementType === 'dynamic' ? `{${el.fieldKey}}` : '');
    setEditingText(initialText);
    requestAnimationFrame(() => {
      if (inlineTextareaRef.current) {
        inlineTextareaRef.current.focus();
        inlineTextareaRef.current.select();
        inlineTextareaRef.current.style.height = 'auto';
        inlineTextareaRef.current.style.height = `${inlineTextareaRef.current.scrollHeight}px`;
      }
    });
  }, []);

  const commitInlineEditing = useCallback(() => {
    if (!editingId) return;
    const el = elements.find((x) => x.id === editingId);
    if (!el) {
      setEditingId(null);
      return;
    }
    pushHistory(elements);
    const trimmed = editingText;
    const nextElements = elements.map((item) => {
      if (item.id === editingId) {
        return {
          ...item,
          defaultValue: trimmed,
        };
      }
      return item;
    });
    onElementsChange(nextElements);
    if (onSaveImmediately) onSaveImmediately(nextElements);
    setEditingId(null);
    showToast('แก้ไขข้อความเรียบร้อย');
  }, [editingId, editingText, elements, onElementsChange, onSaveImmediately, pushHistory, showToast]);

  const cancelInlineEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  // Image Caches & Processing
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const imageElementsCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const processedImagesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Load Background Image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = backgroundImage;
    img.onload = () => {
      bgImgRef.current = img;
      setBgImageLoaded(true);
    };
  }, [backgroundImage]);

  // Pre-load element images and QR codes
  useEffect(() => {
    elements.forEach((el) => {
      if (el.elementType === 'image' && el.defaultValue) {
        const { url } = parseImageMetadata(el);
        if (url && !imageElementsCache.current.has(url)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = url;
          img.onload = () => {
            imageElementsCache.current.set(url, img);
            drawCanvas();
          };
        }
      } else if (el.elementType === 'qrcode') {
        const qrKey = `qr_${el.id}_${el.defaultValue || sampleData.certNumber}`;
        if (!imageElementsCache.current.has(qrKey)) {
          const qrUrl = el.defaultValue || `https://cmtc.ac.th/cert/${sampleData.certNumber || 'DEMO'}`;
          QRCode.toDataURL(qrUrl, { margin: 1, width: 200 })
            .then((dataUrl) => {
              const img = new Image();
              img.src = dataUrl;
              img.onload = () => {
                imageElementsCache.current.set(qrKey, img);
                drawCanvas();
              };
            })
            .catch((err) => console.warn('QR error:', err));
        }
      }
    });
  }, [elements, sampleData.certNumber]);

  // Process Image with White-Cutout and Sharpening Filter
  const getProcessedImageCanvas = useCallback(
    (
      rawImg: HTMLImageElement,
      cacheKey: string,
      removeWhiteBg: boolean,
      sharpenLevel: number,
      brightness: number = 0,
      contrast: number = 0
    ): HTMLCanvasElement | HTMLImageElement => {
      if (!removeWhiteBg && !sharpenLevel && !brightness && !contrast) {
        return rawImg;
      }
      const fullKey = `${cacheKey}_${removeWhiteBg}_${sharpenLevel}_${brightness}_${contrast}`;
      if (processedImagesRef.current.has(fullKey)) {
        return processedImagesRef.current.get(fullKey)!;
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

          // 1. Remove White Background (White cutout threshold with soft edge anti-aliasing)
          if (removeWhiteBg) {
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const lum = (r + g + b) / 3;
              if (lum > 220) {
                data[i + 3] = 0;
              } else if (lum > 180) {
                const alphaFactor = (220 - lum) / 40;
                data[i + 3] = Math.round(data[i + 3] * alphaFactor);
              }
            }
          }

          // 2. Unsharp Masking / Sharpen Convolution Filter
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
        } catch (e) {
          console.warn('Image filtering exception:', e);
        }
      }

      processedImagesRef.current.set(fullKey, off);
      return off;
    },
    []
  );

  // Responsive scale calculation to fill the screen beautifully
  const autoFitScale = useCallback(() => {
    if (containerRef.current) {
      const isDesktop = window.innerWidth >= 1024;
      const availableWidth = isDesktop
        ? containerRef.current.clientWidth - 410
        : containerRef.current.clientWidth - 32;
      const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 700;

      if (availableWidth > 300) {
        const scaleW = availableWidth / width;
        const scaleH = availableHeight > 350 ? availableHeight / height : scaleW;
        const fitScale = Math.min(scaleW, scaleH);
        const targetScale = Math.min(1.4, Math.max(0.45, Number(fitScale.toFixed(2))));
        setCanvasScale(targetScale);
      }
    }
  }, [width, height]);

  useEffect(() => {
    autoFitScale();
    window.addEventListener('resize', autoFitScale);
    return () => window.removeEventListener('resize', autoFitScale);
  }, [autoFitScale]);

  // Auto-select first element if none selected
  useEffect(() => {
    if (!selectedId && elements.length > 0) {
      setSelectedId(elements[0].id);
    }
  }, [elements, selectedId]);

  // Get resolved text for element
  const getElementText = useCallback(
    (el: CanvasElement) => {
      if (el.elementType === 'image' || el.elementType === 'qrcode') return '';

      if (!isPreviewMode) {
        if (el.elementType === 'dynamic') {
          if (el.fieldKey === 'certNumber') return '{certNumber}';
          if (el.fieldKey === 'fullName') return '{fullName}';
          if (el.fieldKey === 'organization') return '{organization}';
          if (el.fieldKey === 'note') return '{note}';
          if (el.fieldKey === 'eventDate') return '{eventDate}';
          return el.defaultValue || '{customText}';
        }
        return el.defaultValue || 'ข้อความ';
      }

      // Preview mode
      let text = '';
      if (el.elementType === 'dynamic') {
        if (el.fieldKey === 'certNumber') text = sampleData.certNumber || 'CMTC-2569-ศขม.0001';
        else if (el.fieldKey === 'fullName') text = sampleData.fullName || 'นายสุรศักดิ์ ยะกัน';
        else if (el.fieldKey === 'organization') text = sampleData.organization || 'วิทยาลัยเทคนิคเชียงใหม่';
        else if (el.fieldKey === 'note') text = sampleData.note || 'หมายเหตุ';
        else if (el.fieldKey === 'eventDate') text = sampleData.eventDate || '12-14 พฤษภาคม 2569';
        else text = el.defaultValue || '';
      } else {
        text = el.defaultValue || '';
      }

      return text
        .replace(/{certNumber}/g, sampleData.certNumber || '')
        .replace(/{fullName}/g, sampleData.fullName || '')
        .replace(/{organization}/g, sampleData.organization || '')
        .replace(/{note}/g, sampleData.note || '')
        .replace(/{eventDate}/g, sampleData.eventDate || '');
    },
    [isPreviewMode, sampleData]
  );

  // Calculate element raw bounding box
  const getElementBounds = useCallback(
    (el: CanvasElement, ctx: CanvasRenderingContext2D): ElementBounds => {
      if (el.elementType === 'image' || el.elementType === 'qrcode') {
        const w = el.width || (el.elementType === 'qrcode' ? 90 : 120);
        const h = el.height || (el.elementType === 'qrcode' ? 90 : 120);
        const x1 = el.posX - w / 2;
        const y1 = el.posY - h / 2;
        return {
          x1,
          y1,
          x2: x1 + w,
          y2: y1 + h,
          centerX: el.posX,
          centerY: el.posY,
          width: w,
          height: h,
        };
      }

      const text = getElementText(el);
      const isBold = el.fontWeight === 'bold';
      const isItalic = el.fontStyle === 'italic';
      const stylePrefix = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}`;

      ctx.save();
      ctx.font = `${stylePrefix}${el.fontSize}px "${el.fontFamily || 'Sarabun'}", sans-serif`;

      const lines = text.split('\n');
      const lineHeight = (el.lineHeight || 1.4) * el.fontSize;
      let maxW = 0;
      lines.forEach((l) => {
        const m = ctx.measureText(l);
        if (m.width > maxW) maxW = m.width;
      });

      if (el.maxWidth && el.maxWidth > 0) {
        maxW = Math.max(maxW, el.maxWidth);
      }

      const totalH = Math.max(lineHeight, lines.length * lineHeight);

      let x1 = el.posX;
      if (el.textAlign === 'center') {
        x1 = el.posX - maxW / 2;
      } else if (el.textAlign === 'right') {
        x1 = el.posX - maxW;
      }
      const y1 = el.posY - totalH / 2;

      ctx.restore();

      return {
        x1,
        y1,
        x2: x1 + maxW,
        y2: y1 + totalH,
        centerX: el.textAlign === 'center' ? el.posX : x1 + maxW / 2,
        centerY: el.posY,
        width: Math.max(10, maxW),
        height: Math.max(10, totalH),
      };
    },
    [getElementText]
  );

  // Compute Element Frame with 8 resize handles
  const getElementFrame = useCallback(
    (bounds: ElementBounds, isSquareLocked = false): ElementFrame => {
      const pad = isSquareLocked ? 4 : 8;
      const left = bounds.x1 - pad;
      const top = bounds.y1 - pad;
      const right = bounds.x2 + pad;
      const bottom = bounds.y2 + pad;
      const w = right - left;
      const h = bottom - top;
      const midX = left + w / 2;
      const midY = top + h / 2;

      return {
        left,
        top,
        right,
        bottom,
        width: w,
        height: h,
        centerX: midX,
        centerY: midY,
        handles: {
          nw: { x: left, y: top, cursor: 'nwse-resize' },
          ne: { x: right, y: top, cursor: 'nesw-resize' },
          se: { x: right, y: bottom, cursor: 'nwse-resize' },
          sw: { x: left, y: bottom, cursor: 'nesw-resize' },
          n: { x: midX, y: top, cursor: 'ns-resize' },
          s: { x: midX, y: bottom, cursor: 'ns-resize' },
          w: { x: left, y: midY, cursor: 'ew-resize' },
          e: { x: right, y: midY, cursor: 'ew-resize' },
        },
      };
    },
    []
  );

  // Hit-test Resize Handle
  const getHandleOrBorderAtPos = useCallback(
    (frame: ElementFrame, x: number, y: number, scaleVal: number) => {
      const threshold = 14 / scaleVal;

      for (const [key, handle] of Object.entries(frame.handles)) {
        const dist = Math.hypot(x - handle.x, y - handle.y);
        if (dist <= threshold) {
          return { type: 'handle', handle: key as ResizeHandleType, cursor: handle.cursor };
        }
      }

      const borderThresh = 8 / scaleVal;
      const nearLeft = Math.abs(x - frame.left) <= borderThresh && y >= frame.top && y <= frame.bottom;
      const nearRight = Math.abs(x - frame.right) <= borderThresh && y >= frame.top && y <= frame.bottom;
      const nearTop = Math.abs(y - frame.top) <= borderThresh && x >= frame.left && x <= frame.right;
      const nearBottom = Math.abs(y - frame.bottom) <= borderThresh && x >= frame.left && x <= frame.right;

      if (nearLeft || nearRight || nearTop || nearBottom) {
        return { type: 'border', handle: null, cursor: 'grab' };
      }

      return null;
    },
    []
  );

  // In-place inline edit box position
  const getInlineBoxPosition = useCallback(
    (el: CanvasElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return { left: 0, top: 0, width: 220, minHeight: 40 };
      const ctx = canvas.getContext('2d');
      if (!ctx) return { left: 0, top: 0, width: 220, minHeight: 40 };

      const bounds = getElementBounds(el, ctx);
      const textW = bounds.width;
      const boxW = Math.max(180, (textW + 40) * canvasScale);
      const boxH = Math.max(36, bounds.height * canvasScale + 12);

      let left = (bounds.x1 - 15) * canvasScale;
      if (el.textAlign === 'center') {
        left = el.posX * canvasScale - boxW / 2;
      } else if (el.textAlign === 'right') {
        left = el.posX * canvasScale - boxW + 10;
      }
      const maxLeft = width * canvasScale - boxW;
      left = Math.max(8, Math.min(left, maxLeft));
      const top = Math.max(8, (bounds.y1 - 6) * canvasScale);

      return { left, top, width: boxW, minHeight: boxH };
    },
    [canvasScale, getElementBounds, width]
  );

  // Redraw Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background Image
    if (bgImgRef.current && bgImageLoaded) {
      ctx.drawImage(bgImgRef.current, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px Sarabun';
      ctx.textAlign = 'center';
      ctx.fillText('กำลังโหลดภาพพื้นหลัง...', width / 2, height / 2);
    }

    // 2. Draw Grid Lines (if enabled)
    if (showGrid && !isPreviewMode) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Selection Bounding Frame Drawer
    const drawBoundingFrame = (el: CanvasElement, bounds: ElementBounds) => {
      const isSquareLocked = el.elementType === 'image' || el.elementType === 'qrcode';
      const frame = getElementFrame(bounds, isSquareLocked);

      ctx.save();
      ctx.globalAlpha = 1.0;

      const isLocked = Boolean(el.isLocked);
      const activeColor = isLocked ? '#ef4444' : isResizing ? '#0284c7' : '#9f1239'; // CMTC Crimson
      const activeGlow = isLocked ? 'rgba(239, 68, 68, 0.35)' : isResizing ? 'rgba(2, 132, 199, 0.4)' : 'rgba(159, 18, 57, 0.3)';

      // Selection Frame
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = isResizing ? 2.5 : 2;
      ctx.setLineDash(isResizing ? [] : [6, 4]);
      ctx.shadowColor = activeGlow;
      ctx.shadowBlur = 8;
      ctx.strokeRect(frame.left, frame.top, frame.width, frame.height);

      ctx.setLineDash([]);
      ctx.shadowColor = 'transparent';

      if (!isLocked) {
        // Midpoint Edge Handles
        const drawBar = (hx: number, hy: number, isVertical: boolean) => {
          ctx.fillStyle = activeColor;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          const bw = isVertical ? 5 : 14;
          const bh = isVertical ? 14 : 5;
          ctx.beginPath();
          if ((ctx as any).roundRect) {
            (ctx as any).roundRect(hx - bw / 2, hy - bh / 2, bw, bh, 2);
          } else {
            ctx.rect(hx - bw / 2, hy - bh / 2, bw, bh);
          }
          ctx.fill();
          ctx.stroke();
        };
        drawBar(frame.handles.n.x, frame.handles.n.y, false);
        drawBar(frame.handles.s.x, frame.handles.s.y, false);
        drawBar(frame.handles.w.x, frame.handles.w.y, true);
        drawBar(frame.handles.e.x, frame.handles.e.y, true);

        // Corner Handles
        const corners: ResizeHandleType[] = ['nw', 'ne', 'se', 'sw'];
        corners.forEach((c) => {
          const pt = frame.handles[c];
          ctx.fillStyle = activeColor;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }

      // Floating Live Size Pill
      const label = isLocked
        ? '🔒 ล็อกตำแหน่งอยู่'
        : el.elementType === 'image' || el.elementType === 'qrcode'
        ? `${Math.round(bounds.width)} × ${Math.round(bounds.height)} px`
        : `ขนาด: ${el.fontSize}px • ดับเบิ้ลคลิกเพื่อพิมพ์แก้คำ`;

      ctx.font = 'bold 11px Prompt, sans-serif';
      const pillW = ctx.measureText(label).width + 16;
      const pillH = 22;
      const pillX = frame.centerX - pillW / 2;
      const pillY = frame.bottom + 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 6;
      if ((ctx as any).roundRect) {
        ctx.beginPath();
        (ctx as any).roundRect(pillX, pillY, pillW, pillH, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(pillX, pillY, pillW, pillH);
        ctx.strokeRect(pillX, pillY, pillW, pillH);
      }

      ctx.shadowColor = 'transparent';
      ctx.fillStyle = isLocked ? '#fca5a5' : isResizing ? '#38bdf8' : '#fda4af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, frame.centerX, pillY + pillH / 2);

      ctx.restore();
    };

    // 4. Draw All Elements
    elements.forEach((el) => {
      ctx.save();
      const isSelected = el.id === selectedId && !isPreviewMode;

      if (el.id === editingId) {
        ctx.restore();
        return;
      }

      const elemOpacity = el.opacity !== undefined && el.opacity !== null ? el.opacity : 1.0;
      ctx.globalAlpha = Math.max(0, Math.min(1, elemOpacity));

      // A. Image Element
      if (el.elementType === 'image') {
        const bounds = getElementBounds(el, ctx);
        const { url, removeWhiteBg, sharpen, brightness, contrast } = parseImageMetadata(el);
        const cachedImg = url ? imageElementsCache.current.get(url) : null;

        if (cachedImg) {
          const finalImg = getProcessedImageCanvas(
            cachedImg,
            el.id,
            removeWhiteBg,
            sharpen,
            brightness,
            contrast
          );
          ctx.drawImage(finalImg, bounds.x1, bounds.y1, bounds.width, bounds.height);
        } else {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(bounds.x1, bounds.y1, bounds.width, bounds.height);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bounds.x1, bounds.y1, bounds.width, bounds.height);
          ctx.fillStyle = '#64748b';
          ctx.font = '12px Sarabun';
          ctx.textAlign = 'center';
          ctx.fillText('กำลังโหลดรูปภาพ...', bounds.centerX, bounds.centerY);
        }

        if (isSelected) {
          drawBoundingFrame(el, bounds);
        }
        ctx.restore();
        return;
      }

      // B. QR Code Element
      if (el.elementType === 'qrcode') {
        const bounds = getElementBounds(el, ctx);
        const qrKey = `qr_${el.id}_${el.defaultValue || sampleData.certNumber}`;
        const cachedQr = imageElementsCache.current.get(qrKey);

        if (cachedQr) {
          ctx.drawImage(cachedQr, bounds.x1, bounds.y1, bounds.width, bounds.height);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bounds.x1, bounds.y1, bounds.width, bounds.height);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.strokeRect(bounds.x1, bounds.y1, bounds.width, bounds.height);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('QR Code', bounds.centerX, bounds.centerY);
        }

        if (isSelected) {
          drawBoundingFrame(el, bounds);
        }
        ctx.restore();
        return;
      }

      // C. Text Element (Dynamic or Static)
      const text = getElementText(el);
      const isBold = el.fontWeight === 'bold';
      const isItalic = el.fontStyle === 'italic';
      const stylePrefix = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}`;

      ctx.font = `${stylePrefix}${el.fontSize}px "${el.fontFamily || 'Sarabun'}", sans-serif`;
      ctx.fillStyle = el.fontColor || '#000000';
      ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';

      const lines = text.split('\n');
      const lineHeight = (el.lineHeight || 1.4) * el.fontSize;
      const totalH = lines.length * lineHeight;
      const startY = el.posY - totalH / 2 + lineHeight / 2;

      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineHeight;
        ctx.fillText(line, el.posX, lineY);

        if (el.isUnderline) {
          const m = ctx.measureText(line);
          let underlineX1 = el.posX;
          if (el.textAlign === 'center') underlineX1 = el.posX - m.width / 2;
          else if (el.textAlign === 'right') underlineX1 = el.posX - m.width;
          const underlineX2 = underlineX1 + m.width;
          const underlineY = lineY + el.fontSize * 0.45;

          ctx.save();
          ctx.strokeStyle = el.fontColor || '#000000';
          ctx.lineWidth = Math.max(1, el.fontSize * 0.06);
          ctx.beginPath();
          ctx.moveTo(underlineX1, underlineY);
          ctx.lineTo(underlineX2, underlineY);
          ctx.stroke();
          ctx.restore();
        }
      });

      if (isSelected) {
        const bounds = getElementBounds(el, ctx);
        drawBoundingFrame(el, bounds);
      }

      ctx.restore();
    });

    // 5. Smart Snap Guides (Canva-style pink alignment lines)
    if (enableSnap && (activeGuides.verticalCenter || activeGuides.horizontalCenter)) {
      ctx.save();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);

      if (activeGuides.verticalCenter) {
        ctx.beginPath();
        ctx.moveTo(Math.round(width / 2), 0);
        ctx.lineTo(Math.round(width / 2), height);
        ctx.stroke();
      }

      if (activeGuides.horizontalCenter) {
        ctx.beginPath();
        ctx.moveTo(0, Math.round(height / 2));
        ctx.lineTo(width, Math.round(height / 2));
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [
    activeGuides,
    bgImageLoaded,
    editingId,
    elements,
    enableSnap,
    getElementBounds,
    getElementFrame,
    getElementText,
    getProcessedImageCanvas,
    height,
    isPreviewMode,
    isResizing,
    selectedId,
    showGrid,
    width,
  ]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Pointer & Mouse coordinates relative to Canvas
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / canvasScale,
      y: (e.clientY - rect.top) / canvasScale,
    };
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPreviewMode) return;
    const { x, y } = getCanvasCoords(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (selectedId) {
      const selectedEl = elements.find((item) => item.id === selectedId);
      if (selectedEl && !selectedEl.isLocked) {
        const bounds = getElementBounds(selectedEl, ctx);
        const isSquareLocked = selectedEl.elementType === 'image' || selectedEl.elementType === 'qrcode';
        const frame = getElementFrame(bounds, isSquareLocked);
        const hit = getHandleOrBorderAtPos(frame, x, y, canvasScale);

        if (hit && hit.type === 'handle' && hit.handle) {
          setIsResizing(true);
          dragSnapshotRef.current = JSON.parse(JSON.stringify(elements));
          const initialDist = Math.hypot(x - bounds.centerX, y - bounds.centerY);
          setResizeState({
            handle: hit.handle,
            startX: x,
            startY: y,
            centerX: bounds.centerX,
            centerY: bounds.centerY,
            initialDist: Math.max(1, initialDist),
            initialFontSize: selectedEl.fontSize,
            initialWidth: bounds.width,
            initialHeight: bounds.height,
          });
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // Hit-test elements in reverse order (top layer first)
    let clickedEl: CanvasElement | null = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const bounds = getElementBounds(el, ctx);
      if (x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2) {
        clickedEl = el;
        break;
      }
    }

    if (clickedEl) {
      setSelectedId(clickedEl.id);
      if (!clickedEl.isLocked) {
        setIsDragging(true);
        dragSnapshotRef.current = JSON.parse(JSON.stringify(elements));
        setDragOffset({
          x: x - clickedEl.posX,
          y: y - clickedEl.posY,
        });
        dragStartPosRef.current = { x, y };
        elemOriginPosRef.current = { posX: clickedEl.posX, posY: clickedEl.posY };
        dragAxisRef.current = 'free';
        setIsShiftActive(e.shiftKey);
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      setSelectedId(null);
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPreviewMode) return;
    const { x, y } = getCanvasCoords(e);
    setIsShiftActive(e.shiftKey);

    // Resizing
    if (isResizing && resizeState && selectedId) {
      const selEl = elements.find((item) => item.id === selectedId);
      if (!selEl || selEl.isLocked) return;

      const currentDist = Math.hypot(x - resizeState.centerX, y - resizeState.centerY);
      const ratio = currentDist / resizeState.initialDist;

      if (selEl.elementType === 'image' || selEl.elementType === 'qrcode') {
        let newW = Math.round(Math.max(20, Math.min(width, resizeState.initialWidth * ratio)));
        let newH = Math.round(Math.max(20, Math.min(height, resizeState.initialHeight * ratio)));
        const nextElements = elements.map((item) =>
          item.id === selectedId ? { ...item, width: newW, height: newH } : item
        );
        onElementsChange(nextElements);
      } else {
        const newFontSize = Math.round(
          Math.max(10, Math.min(120, resizeState.initialFontSize * ratio))
        );
        const nextElements = elements.map((item) =>
          item.id === selectedId ? { ...item, fontSize: newFontSize } : item
        );
        onElementsChange(nextElements);
      }
      return;
    }

    // Dragging
    if (isDragging && selectedId) {
      const selEl = elements.find((item) => item.id === selectedId);
      if (!selEl || selEl.isLocked) return;

      let newX = x - dragOffset.x;
      let newY = y - dragOffset.y;

      if (e.shiftKey) {
        const dx = Math.abs(x - dragStartPosRef.current.x);
        const dy = Math.abs(y - dragStartPosRef.current.y);
        if (dragAxisRef.current === 'free') {
          if (dx > 4 || dy > 4) {
            dragAxisRef.current = dx >= dy ? 'horizontal' : 'vertical';
          }
        }
        if (dragAxisRef.current === 'horizontal') {
          newY = elemOriginPosRef.current.posY;
        } else if (dragAxisRef.current === 'vertical') {
          newX = elemOriginPosRef.current.posX;
        }
      } else {
        dragAxisRef.current = 'free';
      }

      // Snapping
      const guides = { verticalCenter: false, horizontalCenter: false };
      if (enableSnap) {
        const canvasCenterX = Math.round(width / 2);
        const canvasCenterY = Math.round(height / 2);

        if (selEl.textAlign === 'center' || selEl.elementType === 'image' || selEl.elementType === 'qrcode') {
          if (Math.abs(newX - canvasCenterX) <= 7) {
            newX = canvasCenterX;
            guides.verticalCenter = true;
          }
        }

        if (Math.abs(newY - canvasCenterY) <= 7) {
          newY = canvasCenterY;
          guides.horizontalCenter = true;
        }
      }
      setActiveGuides(guides);

      const nextElements = elements.map((item) =>
        item.id === selectedId ? { ...item, posX: Math.round(newX), posY: Math.round(newY) } : item
      );
      onElementsChange(nextElements);
      return;
    }

    // Hover Cursor Styling
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (selectedId) {
      const selEl = elements.find((item) => item.id === selectedId);
      if (selEl) {
        if (selEl.isLocked) {
          setCursorStyle('not-allowed');
          return;
        }
        const bounds = getElementBounds(selEl, ctx);
        const isSquareLocked = selEl.elementType === 'image' || selEl.elementType === 'qrcode';
        const frame = getElementFrame(bounds, isSquareLocked);
        const hit = getHandleOrBorderAtPos(frame, x, y, canvasScale);

        if (hit) {
          setCursorStyle(hit.cursor);
          return;
        }
      }
    }

    let isOverAny = false;
    for (let i = elements.length - 1; i >= 0; i--) {
      const bounds = getElementBounds(elements[i], ctx);
      if (x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2) {
        isOverAny = true;
        break;
      }
    }

    setCursorStyle(isOverAny ? 'pointer' : 'default');
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging || isResizing) {
      if (dragSnapshotRef.current) {
        pushHistory(dragSnapshotRef.current);
        dragSnapshotRef.current = null;
      }
      if (onSaveImmediately) {
        onSaveImmediately(elements);
      }
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeState(null);
    setActiveGuides({ verticalCenter: false, horizontalCenter: false });
    dragAxisRef.current = 'free';
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  // Double-Click: Start Inline Text Edit
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPreviewMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasScale;
    const y = (e.clientY - rect.top) / canvasScale;

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.elementType === 'image' || el.elementType === 'qrcode' || el.isLocked) continue;
      const bounds = getElementBounds(el, ctx);
      if (x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2) {
        startInlineEditing(el);
        return;
      }
    }
  };

  // Keyboard Shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Delete, Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelInlineEditing();
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commitInlineEditing();
        }
        return;
      }

      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
      // Copy: Ctrl+C
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      }
      // Paste: Ctrl+V
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      }
      // Delete: Backspace or Delete
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDeleteElement(selectedId);
      }
      // Enter: Edit selected text
      else if (e.key === 'Enter' && selectedId) {
        const selEl = elements.find((x) => x.id === selectedId);
        if (selEl && selEl.elementType !== 'image' && selEl.elementType !== 'qrcode' && !selEl.isLocked) {
          e.preventDefault();
          startInlineEditing(selEl);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cancelInlineEditing,
    commitInlineEditing,
    editingId,
    elements,
    handleCopy,
    handlePaste,
    handleRedo,
    handleUndo,
    selectedId,
    startInlineEditing,
  ]);

  // Alignment Helpers
  const alignCenterX = useCallback(() => {
    if (!selectedId) return;
    pushHistory(elements);
    const centerX = Math.round(width / 2);
    const nextElements = elements.map((item) =>
      item.id === selectedId ? { ...item, posX: centerX } : item
    );
    onElementsChange(nextElements);
    if (onSaveImmediately) onSaveImmediately(nextElements);
    showToast('จัดกึ่งกลางแนวนอนแล้ว');
  }, [elements, onElementsChange, onSaveImmediately, pushHistory, selectedId, showToast, width]);

  const alignCenterY = useCallback(() => {
    if (!selectedId) return;
    pushHistory(elements);
    const centerY = Math.round(height / 2);
    const nextElements = elements.map((item) =>
      item.id === selectedId ? { ...item, posY: centerY } : item
    );
    onElementsChange(nextElements);
    if (onSaveImmediately) onSaveImmediately(nextElements);
    showToast('จัดกึ่งกลางแนวตั้งแล้ว');
  }, [elements, height, onElementsChange, onSaveImmediately, pushHistory, selectedId, showToast]);

  const alignCenterBoth = useCallback(() => {
    if (!selectedId) return;
    pushHistory(elements);
    const centerX = Math.round(width / 2);
    const centerY = Math.round(height / 2);
    const nextElements = elements.map((item) =>
      item.id === selectedId ? { ...item, posX: centerX, posY: centerY } : item
    );
    onElementsChange(nextElements);
    if (onSaveImmediately) onSaveImmediately(nextElements);
    showToast('จัดกึ่งกลางทั้งหน้าแคนวาสแล้ว');
  }, [elements, height, onElementsChange, onSaveImmediately, pushHistory, selectedId, showToast, width]);

  const alignLeft = useCallback(() => {
    if (!selectedId) return;
    pushHistory(elements);
    const nextElements = elements.map((item) =>
      item.id === selectedId ? { ...item, posX: 80, textAlign: 'left' } : item
    );
    onElementsChange(nextElements);
    if (onSaveImmediately) onSaveImmediately(nextElements);
    showToast('จัดชิดซ้ายแล้ว');
  }, [elements, onElementsChange, onSaveImmediately, pushHistory, selectedId, showToast]);

  const alignRight = useCallback(() => {
    if (!selectedId) return;
    pushHistory(elements);
    const nextElements = elements.map((item) =>
      item.id === selectedId ? { ...item, posX: width - 80, textAlign: 'right' } : item
    );
    onElementsChange(nextElements);
    if (onSaveImmediately) onSaveImmediately(nextElements);
    showToast('จัดชิดขวาแล้ว');
  }, [elements, onElementsChange, onSaveImmediately, pushHistory, selectedId, showToast, width]);

  // Layer Management
  const moveLayer = useCallback(
    (direction: 'up' | 'down' | 'front' | 'back') => {
      if (!selectedId) return;
      const index = elements.findIndex((el) => el.id === selectedId);
      if (index === -1) return;

      pushHistory(elements);
      const newElements = [...elements];
      const target = newElements.splice(index, 1)[0];

      if (direction === 'front') {
        newElements.push(target);
      } else if (direction === 'back') {
        newElements.unshift(target);
      } else if (direction === 'up') {
        const newIdx = Math.min(newElements.length, index + 1);
        newElements.splice(newIdx, 0, target);
      } else if (direction === 'down') {
        const newIdx = Math.max(0, index - 1);
        newElements.splice(newIdx, 0, target);
      }

      onElementsChange(newElements);
      if (onSaveImmediately) onSaveImmediately(newElements);
      showToast('ปรับระดับเลเยอร์เรียบร้อย');
    },
    [elements, onElementsChange, onSaveImmediately, pushHistory, selectedId, showToast]
  );

  // Toggle Lock
  const toggleLockElement = useCallback(
    (id: string) => {
      pushHistory(elements);
      const nextElements = elements.map((el) =>
        el.id === id ? { ...el, isLocked: !el.isLocked } : el
      );
      onElementsChange(nextElements);
      if (onSaveImmediately) onSaveImmediately(nextElements);
      const isNowLocked = nextElements.find((x) => x.id === id)?.isLocked;
      showToast(isNowLocked ? '🔒 ล็อกตำแหน่งแล้ว' : '🔓 ปลดล็อกตำแหน่งแล้ว');
    },
    [elements, onElementsChange, onSaveImmediately, pushHistory, showToast]
  );

  // Add Element Handlers
  const handleAddTextElement = useCallback(() => {
    pushHistory(elements);
    const newId = `elem_${Date.now()}`;
    const newEl: CanvasElement = {
      id: newId,
      elementType: 'static',
      fieldKey: 'customText',
      defaultValue: 'ข้อความใหม่',
      posX: Math.round(width / 2),
      posY: Math.round(height / 2),
      fontSize: 24,
      fontFamily: 'Sarabun',
      fontColor: '#0f172a',
      textAlign: 'center',
      lineHeight: 1.4,
      maxWidth: null,
      fontWeight: 'normal',
      fontStyle: 'normal',
      isUnderline: false,
      letterSpacing: 0,
      opacity: 1.0,
      isLocked: false,
    };
    const next = [...elements, newEl];
    onElementsChange(next);
    setSelectedId(newId);
    if (onSaveImmediately) onSaveImmediately(next);
    showToast('เพิ่มข้อความใหม่แล้ว');
  }, [elements, height, onElementsChange, onSaveImmediately, pushHistory, showToast, width]);

  // Add Quick Pre-designed Block
  const handleAddQuickBlock = useCallback(
    (type: string) => {
      pushHistory(elements);
      const newId = `block_${Date.now()}`;
      let newEl: CanvasElement | null = null;

      switch (type) {
        case 'fullName':
          newEl = {
            id: newId,
            elementType: 'dynamic',
            fieldKey: 'fullName',
            defaultValue: '{fullName}',
            posX: Math.round(width / 2),
            posY: Math.round(height * 0.42),
            fontSize: 34,
            fontFamily: 'Sarabun',
            fontColor: '#0f172a',
            textAlign: 'center',
            lineHeight: 1.3,
            fontWeight: 'bold',
            isLocked: false,
          };
          break;
        case 'certNumber':
          newEl = {
            id: newId,
            elementType: 'dynamic',
            fieldKey: 'certNumber',
            defaultValue: '{certNumber}',
            posX: width - 80,
            posY: 60,
            fontSize: 16,
            fontFamily: 'Sarabun',
            fontColor: '#64748b',
            textAlign: 'right',
            lineHeight: 1.4,
            fontWeight: 'normal',
            isLocked: false,
          };
          break;
        case 'organization':
          newEl = {
            id: newId,
            elementType: 'dynamic',
            fieldKey: 'organization',
            defaultValue: '{organization}',
            posX: Math.round(width / 2),
            posY: Math.round(height * 0.49),
            fontSize: 20,
            fontFamily: 'Sarabun',
            fontColor: '#334155',
            textAlign: 'center',
            lineHeight: 1.4,
            fontWeight: 'normal',
            isLocked: false,
          };
          break;
        case 'introText':
          newEl = {
            id: newId,
            elementType: 'static',
            fieldKey: 'customText',
            defaultValue: 'ขอมอบเกียรติบัตรฉบับนี้เพื่อแสดงว่า',
            posX: Math.round(width / 2),
            posY: Math.round(height * 0.35),
            fontSize: 20,
            fontFamily: 'Sarabun',
            fontColor: '#1e293b',
            textAlign: 'center',
            lineHeight: 1.4,
            fontWeight: 'normal',
            isLocked: false,
          };
          break;
        case 'courseText':
          newEl = {
            id: newId,
            elementType: 'static',
            fieldKey: 'customText',
            defaultValue: 'ได้ผ่านการอบรมเชิงปฏิบัติการพัฒนาทักษะวิชาชีพและเทคโนโลยีดิจิทัลสู่อนาคต',
            posX: Math.round(width / 2),
            posY: Math.round(height * 0.56),
            fontSize: 18,
            fontFamily: 'Sarabun',
            fontColor: '#334155',
            textAlign: 'center',
            lineHeight: 1.4,
            fontWeight: 'normal',
            isLocked: false,
          };
          break;
        case 'eventDate':
          newEl = {
            id: newId,
            elementType: 'dynamic',
            fieldKey: 'eventDate',
            defaultValue: 'ให้ไว้ ณ วันที่ {eventDate}',
            posX: Math.round(width / 2),
            posY: Math.round(height * 0.63),
            fontSize: 16,
            fontFamily: 'Sarabun',
            fontColor: '#475569',
            textAlign: 'center',
            lineHeight: 1.4,
            fontWeight: 'normal',
            isLocked: false,
          };
          break;
        case 'signature':
          newEl = {
            id: newId,
            elementType: 'static',
            fieldKey: 'customText',
            defaultValue: '(...................................................)\n(นายสมศักดิ์ ชัยชนะ)\nผู้อำนวยการวิทยาลัยเทคนิคเชียงใหม่',
            posX: Math.round(width * 0.5),
            posY: Math.round(height * 0.8),
            fontSize: 15,
            fontFamily: 'Sarabun',
            fontColor: '#0f172a',
            textAlign: 'center',
            lineHeight: 1.5,
            fontWeight: 'normal',
            isLocked: false,
          };
          break;
        case 'qrcode':
          newEl = {
            id: newId,
            elementType: 'qrcode',
            fieldKey: 'qrcode',
            defaultValue: '',
            posX: 90,
            posY: height - 90,
            width: 85,
            height: 85,
            fontSize: 14,
            fontFamily: 'Sarabun',
            fontColor: '#000000',
            textAlign: 'center',
            lineHeight: 1.4,
            isLocked: false,
          };
          break;
      }

      if (newEl) {
        const next = [...elements, newEl];
        onElementsChange(next);
        setSelectedId(newId);
        if (onSaveImmediately) onSaveImmediately(next);
        showToast('เพิ่มบล็อกข้อความสำเร็จรูปแล้ว');
      }
    },
    [elements, height, onElementsChange, onSaveImmediately, pushHistory, showToast, width]
  );

  // Add QR Code
  const handleAddQrCode = useCallback(() => {
    handleAddQuickBlock('qrcode');
  }, [handleAddQuickBlock]);

  // Image Upload Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        pushHistory(elements);
        const newId = `img_${Date.now()}`;
        const newEl: CanvasElement = {
          id: newId,
          elementType: 'image',
          fieldKey: 'image',
          defaultValue: data.url,
          posX: Math.round(width / 2),
          posY: Math.round(height / 2),
          width: 140,
          height: 140,
          fontSize: 14,
          fontFamily: 'Sarabun',
          fontColor: '#000000',
          textAlign: 'center',
          lineHeight: 1.4,
          opacity: 1.0,
          isLocked: false,
          removeWhiteBg: false,
          filterSharpen: 0,
        };

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = data.url;
        img.onload = () => {
          imageElementsCache.current.set(data.url, img);
          drawCanvas();
        };

        const next = [...elements, newEl];
        onElementsChange(next);
        setSelectedId(newId);
        if (onSaveImmediately) onSaveImmediately(next);
        showToast('อัปโหลดรูปภาพสำเร็จแล้ว');
      } else {
        alert(data.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete Element
  const handleDeleteElement = useCallback(
    (id: string) => {
      const el = elements.find((x) => x.id === id);
      if (el?.isLocked) {
        showToast('องค์ประกอบนี้ถูกล็อกอยู่ กรุณาปลดล็อกก่อนลบ');
        return;
      }
      pushHistory(elements);
      const nextElements = elements.filter((item) => item.id !== id);
      onElementsChange(nextElements);
      setSelectedId(nextElements[0]?.id || null);
      if (onSaveImmediately) onSaveImmediately(nextElements);
      showToast('ลบองค์ประกอบแล้ว');
    },
    [elements, onElementsChange, onSaveImmediately, pushHistory, showToast]
  );

  // Update selected element
  const updateSelected = useCallback(
    (updates: Partial<CanvasElement>) => {
      if (!selectedId) return;
      const nextElements = elements.map((item) => {
        if (item.id === selectedId) {
          const updated = { ...item, ...updates };

          // If updating image filters, sync into defaultValue JSON
          if (item.elementType === 'image') {
            const currentMeta = parseImageMetadata(item);
            const newMeta = {
              url: currentMeta.url,
              sharpen: updates.filterSharpen !== undefined ? Number(updates.filterSharpen) : currentMeta.sharpen,
              removeWhiteBg: updates.removeWhiteBg !== undefined ? Boolean(updates.removeWhiteBg) : currentMeta.removeWhiteBg,
              brightness: updates.filterBrightness !== undefined ? Number(updates.filterBrightness) : currentMeta.brightness,
              contrast: updates.filterContrast !== undefined ? Number(updates.filterContrast) : currentMeta.contrast,
            };
            updated.defaultValue = encodeImageMetadata(
              newMeta.url,
              newMeta.sharpen,
              newMeta.removeWhiteBg,
              newMeta.brightness,
              newMeta.contrast
            );
          }

          return updated;
        }
        return item;
      });
      onElementsChange(nextElements);
      if (onSaveImmediately) onSaveImmediately(nextElements);
    },
    [elements, onElementsChange, onSaveImmediately, selectedId]
  );

  const selectedElement = useMemo(
    () => elements.find((x) => x.id === selectedId),
    [elements, selectedId]
  );

  const selectedImageMeta = useMemo(() => {
    if (selectedElement && selectedElement.elementType === 'image') {
      return parseImageMetadata(selectedElement);
    }
    return null;
  }, [selectedElement]);

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-4 select-none">
      {/* 1. TOP GLOBAL ACTION TOOLBAR */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mode, Undo/Redo, Snapping, Grid */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Edit vs Preview Mode Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setIsPreviewMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isPreviewMode
                  ? 'bg-cmtc-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>โหมดแก้ไข</span>
            </button>
            <button
              onClick={() => setIsPreviewMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isPreviewMode
                  ? 'bg-cmtc-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ดูตัวอย่างพร้อมแทนค่าชื่อ-นามสกุล และเลขทะเบียนจริง"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>พรีวิวข้อมูลจริง</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-lg transition-colors ${
                canUndo ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 cursor-not-allowed'
              }`}
              title="ย้อนกลับ (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-lg transition-colors ${
                canRedo ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300 cursor-not-allowed'
              }`}
              title="ทำซ้ำ (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Magnetic Snap Guides Toggle */}
          <button
            onClick={() => setEnableSnap(!enableSnap)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              enableSnap
                ? 'bg-pink-50 text-pink-700 border-pink-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
            }`}
            title="แม่เหล็กดูดกึ่งกลางอัตโนมัติ (Canva Smart Guides)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ดูดกึ่งกลาง</span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${enableSnap ? 'bg-pink-100 text-pink-800 font-bold' : 'bg-slate-200 text-slate-500'}`}>
              {enableSnap ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showGrid
                ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
            }`}
            title="เปิด/ปิด เส้นตารางช่วยกะระยะ (Grid 25px)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เส้นตาราง</span>
          </button>
        </div>

        {/* Center: Fast Alignment Bar when an element is active */}
        {selectedId && !isPreviewMode && selectedElement && (
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {selectedElement.elementType !== 'image' && selectedElement.elementType !== 'qrcode' && (
              <button
                type="button"
                onClick={() => startInlineEditing(selectedElement)}
                className="px-2 py-1 rounded-lg text-xs bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1 font-semibold transition-all shadow-xs"
                title="ดับเบิ้ลคลิกบนข้อความ หรือกด Enter เพื่อพิมพ์แก้คำ"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="text-[11px]">พิมพ์แก้คำ</span>
              </button>
            )}

            <button
              onClick={alignCenterX}
              className="px-2 py-1 rounded-lg text-xs text-cmtc-800 hover:bg-red-50 flex items-center gap-1 font-semibold transition-all"
              title="จัดกึ่งกลางแนวนอน (Center X)"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">กึ่งกลาง X</span>
            </button>
            <button
              onClick={alignCenterY}
              className="px-2 py-1 rounded-lg text-xs text-cmtc-800 hover:bg-red-50 flex items-center gap-1 font-semibold transition-all"
              title="จัดกึ่งกลางแนวตั้ง (Center Y)"
            >
              <AlignCenterVertical className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">กึ่งกลาง Y</span>
            </button>
            <button
              onClick={alignCenterBoth}
              className="px-2 py-1 rounded-lg text-xs bg-red-50 text-cmtc-800 hover:bg-red-100 border border-red-200 flex items-center gap-1 font-bold transition-all shadow-xs"
              title="จัดกึ่งกลางทั้งหน้าแคนวาส (Center Both)"
            >
              <Crosshair className="w-3.5 h-3.5 text-cmtc-800" />
              <span className="text-[11px]">กลางแผ่น</span>
            </button>

            {/* Lock Button */}
            <button
              onClick={() => toggleLockElement(selectedId)}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 font-semibold transition-all border ${
                selectedElement.isLocked
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'text-slate-600 hover:bg-slate-200 border-transparent'
              }`}
              title={selectedElement.isLocked ? 'ปลดล็อกตำแหน่ง' : 'ล็อกตำแหน่ง (ป้องกันเผลอเลื่อน)'}
            >
              {selectedElement.isLocked ? <Lock className="w-3.5 h-3.5 text-red-700" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline text-[11px]">{selectedElement.isLocked ? 'ล็อกอยู่' : 'ล็อก'}</span>
            </button>

            {/* Copy & Paste */}
            <button
              type="button"
              onClick={handleCopy}
              className="px-2 py-1 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center gap-1 font-medium transition-all"
              title="คัดลอก (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5 text-sky-600" />
            </button>
            <button
              type="button"
              onClick={handlePaste}
              disabled={!clipboardRef.current}
              className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${
                clipboardRef.current ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'
              }`}
              title="วาง (Ctrl+V)"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right: Zoom & Reset Scale */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden xl:inline font-mono">
            {width}×{height}px
          </span>
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCanvasScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded"
              title="ย่อขนาด"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={autoFitScale}
              className="text-xs font-mono px-1.5 py-0.5 rounded font-bold text-cmtc-800 hover:bg-red-50"
              title="คลิกเพื่อปรับขนาดพอดีจออัตโนมัติ"
            >
              {Math.round(canvasScale * 100)}% (พอดีจอ)
            </button>
            <button
              onClick={() => setCanvasScale(1)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold"
              title="ขนาดจริง 100%"
            >
              100%
            </button>
            <button
              onClick={() => setCanvasScale((s) => Math.min(1.5, Number((s + 0.1).toFixed(1))))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded"
              title="ขยายขนาด"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (UNIFIED LEFT PALETTE + FULL-SCREEN CANVAS) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* LEFT PALETTE: ALL TOOLS & INSPECTOR COMBINED (w-full lg:w-[380px] shrink-0) */}
        <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          {/* Navigation Tabs (5 Tabs) */}
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('inspector')}
              className={`py-1.5 rounded-lg transition-all flex flex-col items-center gap-1 relative ${
                activeTab === 'inspector' ? 'bg-white text-cmtc-800 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="ปรับแต่งคุณสมบัติองค์ประกอบที่เลือก"
            >
              <Sliders className="w-4 h-4" />
              <span className="text-[10px]">ปรับแต่ง</span>
              {selectedElement && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cmtc-700" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`py-1.5 rounded-lg transition-all flex flex-col items-center gap-1 ${
                activeTab === 'text' ? 'bg-white text-cmtc-800 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="เพิ่มข้อความและบล็อกสำเร็จรูป"
            >
              <Type className="w-4 h-4" />
              <span className="text-[10px]">ข้อความ</span>
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`py-1.5 rounded-lg transition-all flex flex-col items-center gap-1 ${
                activeTab === 'image' ? 'bg-white text-cmtc-800 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="รูปภาพ โลโก้ และลายเซ็น"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[10px]">รูปภาพ</span>
            </button>
            <button
              onClick={() => setActiveTab('qrcode')}
              className={`py-1.5 rounded-lg transition-all flex flex-col items-center gap-1 ${
                activeTab === 'qrcode' ? 'bg-white text-cmtc-800 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="QR Code ตรวจสอบเกียรติบัตร"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[10px]">QR Code</span>
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              className={`py-1.5 rounded-lg transition-all flex flex-col items-center gap-1 ${
                activeTab === 'layers' ? 'bg-white text-cmtc-800 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="รายการเลเยอร์ทั้งหมด"
            >
              <Layers className="w-4 h-4" />
              <span className="text-[10px]">เลเยอร์</span>
            </button>
          </div>

          {/* TAB 0: INSPECTOR (MERGED FROM RIGHT PANEL) */}
          {activeTab === 'inspector' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cmtc-800" />
                  <span>
                    {selectedElement
                      ? selectedElement.elementType === 'image'
                        ? 'ปรับแต่งรูปภาพ / ลายเซ็น'
                        : selectedElement.elementType === 'qrcode'
                        ? 'ปรับแต่ง QR Code'
                        : 'ปรับแต่งข้อความ'
                      : 'ยังไม่ได้เลือกองค์ประกอบ'}
                  </span>
                </h3>
                {selectedElement && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      selectedElement.isLocked
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selectedElement.isLocked ? '🔒 ล็อกอยู่' : 'แก้ไขได้'}
                  </span>
                )}
              </div>

              {selectedElement ? (
                <div className="space-y-4">
                  {/* A. IMAGE INSPECTOR: SHARPNESS & WHITE CUTOUT FILTERS */}
                  {selectedElement.elementType === 'image' && selectedImageMeta && (
                    <div className="space-y-4">
                      {/* Dimensions */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            ความกว้าง (px)
                          </label>
                          <input
                            type="number"
                            min="20"
                            max="900"
                            value={Math.round(selectedElement.width || 120)}
                            onChange={(e) => updateSelected({ width: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cmtc-700"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            ความสูง (px)
                          </label>
                          <input
                            type="number"
                            min="20"
                            max="900"
                            value={Math.round(selectedElement.height || 120)}
                            onChange={(e) => updateSelected({ height: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cmtc-700"
                          />
                        </div>
                      </div>

                      {/* 1. FILTER: SHARPNESS ENHANCEMENT */}
                      <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-cmtc-900 flex items-center gap-1">
                            <Wand2 className="w-3.5 h-3.5 text-cmtc-800" />
                            <span>เพิ่มความคมชัด (Sharpen)</span>
                          </label>
                          <span className="text-[11px] font-mono font-bold text-cmtc-800">
                            {selectedImageMeta.sharpen}%
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1">
                          {[0, 25, 50, 100].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => updateSelected({ filterSharpen: lvl })}
                              className={`py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                selectedImageMeta.sharpen === lvl
                                  ? 'bg-cmtc-800 text-white border-cmtc-800 shadow-xs'
                                  : 'bg-white text-slate-600 hover:bg-red-50 border-slate-200'
                              }`}
                            >
                              {lvl === 0 ? 'ปกติ' : `+${lvl}%`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. FILTER: REMOVE WHITE BACKGROUND (FOR SIGNATURES & STAMPS) */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <Scissors className="w-3.5 h-3.5 text-slate-700" />
                              <span>ตัดพื้นหลังสีขาว (ลายเซ็นโปร่งใส)</span>
                            </p>
                            <p className="text-[10px] text-slate-500">
                              เหมาะกับลายเซ็นที่เซ็นบนกระดาษขาวแล้วถ่ายรูปมา
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => updateSelected({ removeWhiteBg: !selectedImageMeta.removeWhiteBg })}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              selectedImageMeta.removeWhiteBg ? 'bg-cmtc-800' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                selectedImageMeta.removeWhiteBg ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Opacity */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>ความโปร่งใส (Opacity)</span>
                          <span className="font-mono">
                            {Math.round((selectedElement.opacity ?? 1.0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={selectedElement.opacity ?? 1.0}
                          onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
                          className="w-full accent-cmtc-800 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* B. QR CODE INSPECTOR */}
                  {selectedElement.elementType === 'qrcode' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          ขนาด QR Code (px)
                        </label>
                        <input
                          type="number"
                          min="40"
                          max="300"
                          value={Math.round(selectedElement.width || 85)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateSelected({ width: val, height: val });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cmtc-700"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          ลิงก์ปลายทาง (URL แม่แบบ)
                        </label>
                        <input
                          type="text"
                          value={selectedElement.defaultValue || ''}
                          onChange={(e) => updateSelected({ defaultValue: e.target.value })}
                          placeholder="ค่าเริ่มต้น: ลิงก์ตรวจสอบของแต่ละบุคคล"
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cmtc-700"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          เว้นว่างไว้เพื่อให้ระบบใส่ลิงก์ตรวจสอบรายบุคคลโดยอัตโนมัติ
                        </p>
                      </div>
                    </div>
                  )}

                  {/* C. TEXT ELEMENT INSPECTOR */}
                  {selectedElement.elementType !== 'image' && selectedElement.elementType !== 'qrcode' && (
                    <div className="space-y-3">
                      {/* Field Type */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          ประเภทข้อมูล (Field)
                        </label>
                        <select
                          value={selectedElement.fieldKey}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            const isDynamic = newKey !== 'customText';
                            updateSelected({
                              fieldKey: newKey,
                              elementType: isDynamic ? 'dynamic' : 'static',
                              defaultValue: isDynamic ? `{${newKey}}` : selectedElement.defaultValue || 'ข้อความ',
                            });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cmtc-700"
                        >
                          <option value="customText">ข้อความทั่วไป (Static Text)</option>
                          <option value="fullName">ชื่อ-นามสกุล ผู้รับ ({'{fullName}'})</option>
                          <option value="certNumber">เลขทะเบียนเกียรติบัตร ({'{certNumber}'})</option>
                          <option value="organization">สถานศึกษา / สังกัด ({'{organization}'})</option>
                          <option value="eventDate">วันที่จัดงาน ({'{eventDate}'})</option>
                        </select>
                      </div>

                      {/* Textarea */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          เนื้อหาข้อความ
                        </label>
                        <textarea
                          rows={2}
                          value={selectedElement.defaultValue || ''}
                          onChange={(e) => updateSelected({ defaultValue: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cmtc-700 resize-y"
                        />
                      </div>

                      {/* Thai Font Family */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          แบบอักษร (Font Family)
                        </label>
                        <select
                          value={selectedElement.fontFamily || 'Sarabun'}
                          onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cmtc-700 font-medium"
                        >
                          {THAI_FONTS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Font Size & Slider */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>ขนาดตัวอักษร</span>
                          <span className="font-mono font-bold text-cmtc-800">{selectedElement.fontSize}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="12"
                            max="90"
                            value={selectedElement.fontSize}
                            onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                            className="w-full accent-cmtc-800 cursor-pointer"
                          />
                          <input
                            type="number"
                            min="10"
                            max="120"
                            value={selectedElement.fontSize}
                            onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                            className="w-14 px-2 py-1 text-xs text-center rounded-lg bg-slate-50 border border-slate-200 font-mono"
                          />
                        </div>
                      </div>

                      {/* Typography Styles: Bold, Italic, Underline & Alignment */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() =>
                              updateSelected({
                                fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                              })
                            }
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedElement.fontWeight === 'bold'
                                ? 'bg-cmtc-800 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="ตัวหนา (Bold)"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              updateSelected({
                                fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                              })
                            }
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedElement.fontStyle === 'italic'
                                ? 'bg-cmtc-800 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="ตัวเอียง (Italic)"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              updateSelected({
                                isUnderline: !selectedElement.isUnderline,
                              })
                            }
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedElement.isUnderline
                                ? 'bg-cmtc-800 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="ขีดเส้นใต้ (Underline)"
                          >
                            <UnderlineIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => updateSelected({ textAlign: 'left' })}
                            className={`p-1.5 rounded-lg text-xs transition-all ${
                              selectedElement.textAlign === 'left'
                                ? 'bg-cmtc-800 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="ชิดซ้าย"
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => updateSelected({ textAlign: 'center' })}
                            className={`p-1.5 rounded-lg text-xs transition-all ${
                              selectedElement.textAlign === 'center'
                                ? 'bg-cmtc-800 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="กึ่งกลาง"
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => updateSelected({ textAlign: 'right' })}
                            className={`p-1.5 rounded-lg text-xs transition-all ${
                              selectedElement.textAlign === 'right'
                                ? 'bg-cmtc-800 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="ชิดขวา"
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Colors */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          สีตัวอักษร
                        </label>
                        <div className="flex items-center gap-1.5">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => updateSelected({ fontColor: color })}
                              className={`w-6 h-6 rounded-full border transition-transform ${
                                selectedElement.fontColor?.toLowerCase() === color.toLowerCase()
                                  ? 'scale-110 ring-2 ring-cmtc-800 border-white'
                                  : 'border-slate-300 hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <input
                            type="color"
                            value={selectedElement.fontColor || '#000000'}
                            onChange={(e) => updateSelected({ fontColor: e.target.value })}
                            className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 ml-1"
                            title="เลือกสีแบบกำหนดเอง"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COMMON ACTIONS: LOCK, LAYERS, DUPLICATE, DELETE */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => moveLayer('up')}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>ขยับขึ้น</span>
                      </button>
                      <button
                        onClick={() => moveLayer('down')}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>ขยับลง</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleLockElement(selectedElement.id)}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          selectedElement.isLocked
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {selectedElement.isLocked ? <Lock className="w-3.5 h-3.5 text-red-600" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{selectedElement.isLocked ? 'ปลดล็อก' : 'ล็อกตำแหน่ง'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteElement(selectedElement.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบรายการนี้</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Move className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">คลิกเลือกองค์ประกอบบนเกียรติบัตร</p>
                  <p className="text-[11px] text-slate-400">เพื่อปรับขนาด ฟอนต์ สี ลายเซ็น หรือความคมชัด</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: TEXT ELEMENTS & QUICK PRESETS */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <button
                onClick={handleAddTextElement}
                className="w-full py-2.5 px-3 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ เพิ่มกล่องข้อความเปล่า</span>
              </button>

              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  บล็อกข้อความสำเร็จรูป (คลิกเดียวใส่เลย)
                </p>

                <div className="space-y-1.5">
                  <button
                    onClick={() => handleAddQuickBlock('fullName')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-cmtc-800">
                        👤 ชื่อ-นามสกุล ผู้รับ
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">ฟิลด์ &#123;fullName&#125; (ตัวโต กึ่งกลาง)</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-cmtc-800" />
                  </button>

                  <button
                    onClick={() => handleAddQuickBlock('certNumber')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-cmtc-800">
                        🔢 เลขทะเบียนเกียรติบัตร
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">ฟิลด์ &#123;certNumber&#125; (มุมขวาบน)</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-cmtc-800" />
                  </button>

                  <button
                    onClick={() => handleAddQuickBlock('organization')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-cmtc-800">
                        🏫 ชื่อสถานศึกษา / หน่วยงาน
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">ฟิลด์ &#123;organization&#125;</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-cmtc-800" />
                  </button>

                  <button
                    onClick={() => handleAddQuickBlock('introText')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-cmtc-800">
                        📜 คำนำ &quot;ขอมอบเกียรติบัตร...&quot;
                      </p>
                      <p className="text-[11px] text-slate-500">ข้อความทางการสำหรับเกียรติบัตร</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-cmtc-800" />
                  </button>

                  <button
                    onClick={() => handleAddQuickBlock('courseText')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-cmtc-800">
                        🎯 ข้อความ &quot;ได้ผ่านการอบรม...&quot;
                      </p>
                      <p className="text-[11px] text-slate-500">ระบุหลักสูตรและกิจกรรม</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-cmtc-800" />
                  </button>

                  <button
                    onClick={() => handleAddQuickBlock('eventDate')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-cmtc-800">
                        📅 วันที่จัดงาน / ให้ไว้ ณ วันที่
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">ฟิลด์ &#123;eventDate&#125;</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-cmtc-800" />
                  </button>

                  <button
                    onClick={() => handleAddQuickBlock('signature')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-cmtc-800">
                        ✍️ บล็อกลงชื่อและตำแหน่ง
                      </p>
                      <p className="text-[11px] text-slate-500">เส้นประลงนาม พร้อมตำแหน่ง ผอ.</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-cmtc-800" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMAGES, LOGOS & SIGNATURES */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <label className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploadingImage ? 'กำลังอัปโหลด...' : '+ อัปโหลดรูปภาพ / ลายเซ็น / โลโก้'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageFileChange}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/80 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-cmtc-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cmtc-800" />
                  ระบบประมวลผลภาพอัตโนมัติ:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                  <li>
                    <strong>✂️ ตัดพื้นหลังสีขาว:</strong> ลายเซ็นหรือตราประทับที่เซ็นบนกระดาษขาว สามารถตัดพื้นหลังขาวออกให้โปร่งใสได้ใน 1 คลิก!
                  </li>
                  <li>
                    <strong>✨ Filter เพิ่มความคมชัด:</strong> ดึงเส้นขอบภาพให้คมกริบ ไม่แตกเบลอเวลาพิมพ์
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: QR CODE VERIFICATION */}
          {activeTab === 'qrcode' && (
            <div className="space-y-3">
              <button
                onClick={handleAddQrCode}
                className="w-full py-2.5 px-3 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>+ แทรก QR Code ตรวจสอบเกียรติบัตร</span>
              </button>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  QR Code ยืนยันความถูกต้องแบบ Real-time:
                </p>
                <p className="text-[11px] text-slate-600">
                  เมื่อพิมพ์เกียรติบัตรหรือดาวน์โหลดเป็น PDF/PNG ระบบจะสร้าง QR Code ลิงก์ตรงไปยังหน้าตรวจสอบของรายบุคคลโดยอัตโนมัติ กล้องมือถือสามารถสแกนเพื่อเช็คได้จริงทันที
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: LAYERS LIST */}
          {activeTab === 'layers' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                <span>เลเยอร์ทั้งหมด ({elements.length})</span>
                <span>บนสุด → ล่างสุด</span>
              </div>

              <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                {[...elements].reverse().map((el, revIdx) => {
                  const actualIdx = elements.length - 1 - revIdx;
                  const isSelected = el.id === selectedId;
                  const isImage = el.elementType === 'image';
                  const isQr = el.elementType === 'qrcode';
                  const label = isQr
                    ? 'QR Code ตรวจสอบ'
                    : isImage
                    ? 'รูปภาพ/ตราประทับ'
                    : el.fieldKey === 'fullName'
                    ? 'ชื่อ-นามสกุล'
                    : el.fieldKey === 'certNumber'
                    ? 'เลขทะเบียน'
                    : el.fieldKey === 'organization'
                    ? 'สถานศึกษา'
                    : el.fieldKey === 'eventDate'
                    ? 'วันที่จัดงาน'
                    : el.defaultValue || 'ข้อความ';

                  return (
                    <div
                      key={el.id}
                      onClick={() => {
                        setSelectedId(el.id);
                        setActiveTab('inspector');
                      }}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-red-50 border-red-300 text-cmtc-800 font-bold shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isQr ? (
                          <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : isImage ? (
                          <ImageIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        ) : (
                          <Type className="w-3.5 h-3.5 text-cmtc-800 shrink-0" />
                        )}
                        <span className="truncate max-w-[170px]">{label}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleLockElement(el.id)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded"
                          title={el.isLocked ? 'ปลดล็อก' : 'ล็อก'}
                        >
                          {el.isLocked ? <Lock className="w-3 h-3 text-red-600" /> : <Unlock className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleDeleteElement(el.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="ลบ"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* EXPANDED FULL-SCREEN CANVAS WORKSPACE */}
        <div className="flex-1 min-w-0 w-full flex flex-col items-center">
          {/* Canvas Wrapper */}
          <div
            className="w-full overflow-auto rounded-2xl bg-slate-100/90 border border-slate-300 shadow-inner select-none flex items-center justify-center p-3 sm:p-6"
            style={{ minHeight: '680px' }}
          >
            <div
              className="relative shadow-2xl rounded-sm"
              style={{
                width: `${width * canvasScale}px`,
                height: `${height * canvasScale}px`,
              }}
            >
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={handleCanvasDoubleClick}
                style={{
                  width: `${width * canvasScale}px`,
                  height: `${height * canvasScale}px`,
                  display: 'block',
                  touchAction: 'none',
                  cursor: isResizing
                    ? cursorStyle || 'crosshair'
                    : isDragging
                    ? 'grabbing'
                    : cursorStyle,
                }}
              />

              {/* In-place Text Editing Overlay */}
              {editingId && (() => {
                const el = elements.find((x) => x.id === editingId);
                if (!el) return null;
                const pos = getInlineBoxPosition(el);

                return (
                  <div
                    className="absolute z-40"
                    style={{
                      left: `${pos.left}px`,
                      top: `${pos.top}px`,
                      width: `${pos.width}px`,
                    }}
                  >
                    <textarea
                      ref={inlineTextareaRef}
                      value={editingText}
                      onChange={(e) => {
                        setEditingText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commitInlineEditing();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelInlineEditing();
                        }
                      }}
                      className="w-full text-center font-bold bg-white/95 text-slate-900 border-2 border-red-600 rounded-xl shadow-2xl p-2 outline-none resize-none overflow-hidden"
                      style={{
                        fontSize: `${Math.max(12, Math.round(el.fontSize * canvasScale))}px`,
                        fontFamily: el.fontFamily || 'Sarabun',
                        lineHeight: el.lineHeight || 1.4,
                      }}
                    />

                    {/* Quick Finish / Cancel Buttons */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-50">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          commitInlineEditing();
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow flex items-center gap-1 transition-all"
                      >
                        <Check className="w-3 h-3" />
                        <span>เสร็จสิ้น (Enter)</span>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          cancelInlineEditing();
                        }}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-medium rounded-lg shadow flex items-center gap-1 transition-all"
                      >
                        <X className="w-3 h-3" />
                        <span>ยกเลิก (Esc)</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Floating Toast Notification */}
              {toastMessage && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cmtc-900 text-white border border-red-700 text-xs font-semibold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 pointer-events-none z-50 animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 text-red-200" />
                  <span>{toastMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Helper Tips */}
          <div className="w-full flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-3 px-2">
            <span className="flex items-center gap-1 text-slate-600">
              💡 ดับเบิ้ลคลิกบนข้อความเพื่อพิมพ์แก้คำ | กด Shift เพื่อล็อกแกนลาก | Ctrl+Z ย้อนกลับ | เลือกวัตถุเพื่อปรับแต่งที่แถบซ้ายมือ
            </span>
            <span className="font-mono text-slate-400">
              {elements.length} องค์ประกอบบนแผ่น
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
