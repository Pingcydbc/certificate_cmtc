'use client';

const BUNDLED_FONT_FILES: Record<string, Array<{ weight: string; url: string }>> = {
  'TH Sarabun New': [
    { weight: '400', url: '/fonts/THSarabunNew.ttf' },
    { weight: '700', url: '/fonts/THSarabunNew-Bold.ttf' },
  ],
  Sarabun: [
    { weight: '400', url: '/fonts/Sarabun-Regular.ttf' },
    { weight: '700', url: '/fonts/Sarabun-Bold.ttf' },
  ],
  Prompt: [
    { weight: '400', url: '/fonts/Prompt-Regular.ttf' },
    { weight: '700', url: '/fonts/Prompt-Bold.ttf' },
  ],
  'Chakra Petch': [
    { weight: '400', url: '/fonts/ChakraPetch-Regular.ttf' },
    { weight: '700', url: '/fonts/ChakraPetch-Bold.ttf' },
  ],
  Kanit: [
    { weight: '400', url: '/fonts/Kanit-Regular.ttf' },
    { weight: '700', url: '/fonts/Kanit-Bold.ttf' },
  ],
  Mali: [
    { weight: '400', url: '/fonts/Mali-Regular.ttf' },
    { weight: '700', url: '/fonts/Mali-Bold.ttf' },
  ],
  Niramit: [
    { weight: '400', url: '/fonts/Niramit-Regular.ttf' },
    { weight: '700', url: '/fonts/Niramit-Bold.ttf' },
  ],
};

const THAI_SAMPLE_TEXT =
  'กขคงจฉชซญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮะัาำิีึืุูเแโใไ็่้๊๋์0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const loadedFontPromises = new Map<string, Promise<void>>();

async function loadSingleFontFace(family: string, weight: string, url?: string): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;

  const cssDescriptor = `${weight} 24px "${family}"`;

  let hasLoadedMatch = false;
  try {
    const loadedFaces = await document.fonts.load(cssDescriptor, THAI_SAMPLE_TEXT);
    hasLoadedMatch = Array.isArray(loadedFaces) && loadedFaces.some((f) => f.status === 'loaded');
  } catch {}

  if (!hasLoadedMatch && url && typeof FontFace !== 'undefined') {
    try {
      const face = new FontFace(family, `url(${url})`, {
        weight,
        style: 'normal',
      });
      const loadedFace = await face.load();
      document.fonts.add(loadedFace);
    } catch (err) {
      console.warn(`Failed to load bundled font ${family} (${weight}):`, err);
    }
  }
}

/**
 * Explicitly fetch and decode all @font-face webfonts used by certificate elements
 * before drawing onto a browser <canvas> (essential on pages whose DOM doesn't render those fonts).
 */
export async function ensureCertificateFontsLoaded(
  elements: Array<{
    elementType?: string;
    fontFamily?: string | null;
    fontWeight?: string | null;
    fontStyle?: string | null;
    fontSize?: number | null;
  }>
): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;

  const familiesNeeded = new Set<string>();
  const extraSpecs = new Set<string>();

  for (const el of elements) {
    if (el.elementType && el.elementType !== 'dynamic' && el.elementType !== 'static') continue;
    const family = (el.fontFamily || 'Sarabun').trim();
    familiesNeeded.add(family);
    const weight = el.fontWeight === 'bold' ? '700' : '400';
    const style = el.fontStyle === 'italic' ? 'italic ' : '';
    const size = Math.max(12, Math.round((el.fontSize || 24) * 2));
    extraSpecs.add(`${style}${weight} ${size}px "${family}"`);
  }

  if (familiesNeeded.size === 0) {
    familiesNeeded.add('Sarabun');
    familiesNeeded.add('TH Sarabun New');
  }

  const tasks: Promise<void>[] = [];
  for (const family of Array.from(familiesNeeded)) {
    const bundledEntries = BUNDLED_FONT_FILES[family] || [
      { weight: '400', url: '' },
      { weight: '700', url: '' },
    ];

    for (const entry of bundledEntries) {
      const cacheKey = `${family}::${entry.weight}`;
      let promise = loadedFontPromises.get(cacheKey);
      if (!promise) {
        promise = loadSingleFontFace(family, entry.weight, entry.url).catch(() => {
          loadedFontPromises.delete(cacheKey);
        });
        loadedFontPromises.set(cacheKey, promise);
      }
      tasks.push(promise);
    }
  }

  await Promise.all(tasks);

  await Promise.allSettled(
    Array.from(extraSpecs).map((spec) => document.fonts.load(spec, 'กขคงABC123'))
  );

  await document.fonts.ready;
}
