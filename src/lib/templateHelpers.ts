/**
 * Normalize template element objects for Prisma `create` / `createMany`.
 */
export function mapTemplateElementsForCreate<T extends Record<string, unknown> = Record<string, never>>(
  elements: any[],
  extraData?: T
) {
  return elements.map((el) => ({
    ...(extraData as T),
    elementType: String(el.elementType || 'dynamic'),
    fieldKey: String(el.fieldKey || 'customText'),
    defaultValue: el.defaultValue ?? null,
    posX: Number(el.posX) || 0,
    posY: Number(el.posY) || 0,
    fontSize: Number(el.fontSize) || 24,
    fontFamily: String(el.fontFamily || 'Sarabun'),
    fontColor: String(el.fontColor || '#000000'),
    textAlign: String(el.textAlign || 'center'),
    lineHeight: Number(el.lineHeight) || 1.4,
    maxWidth: el.maxWidth ? Number(el.maxWidth) : null,
    fontWeight: String(el.fontWeight || 'normal'),
    fontStyle: String(el.fontStyle || 'normal'),
    isUnderline: Boolean(el.isUnderline),
    letterSpacing: Number(el.letterSpacing) || 0,
    opacity: el.opacity !== undefined && el.opacity !== null ? Number(el.opacity) : 1.0,
    width: el.width !== undefined && el.width !== null ? Number(el.width) : null,
    height: el.height !== undefined && el.height !== null ? Number(el.height) : null,
  }));
}

export interface TextResolveRecipient {
  nationalId?: string | null;
  certNumber?: string | null;
  fullName?: string | null;
  organization?: string | null;
  trainingLocation?: string | null;
  trainingDate?: string | null;
  signedDate?: string | null;
  note?: string | null;
}

export interface TextResolveProject {
  title?: string | null;
  eventDate?: string | null;
  location?: string | null;
}

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/**
 * Format an Excel numeric date serial (e.g. 244483 or 46156) into a Thai full-month date
 * string ("14 พฤษภาคม 2569"), automatically handling both AD and Buddhist-Era Excel serials.
 */
export function formatExcelSerialToThaiDate(serial: number): string {
  const days = Math.floor(serial);
  const utc = Date.UTC(1899, 11, 30) + days * 86400000;
  const d = new Date(utc);
  const day = d.getUTCDate();
  const monthName = THAI_MONTHS_FULL[d.getUTCMonth()];
  const rawYear = d.getUTCFullYear();
  const beYear = rawYear < 2400 ? rawYear + 543 : rawYear;
  return `${day} ${monthName} ${beYear}`;
}

/**
 * Convert an Excel date serial (stored as number or numeric string) or Date object
 * into a readable Thai date string; non-serial strings pass through unchanged.
 */
export function normalizeThaiDateValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const rawYear = value.getFullYear();
    const beYear = rawYear < 2400 ? rawYear + 543 : rawYear;
    return `${value.getDate()} ${THAI_MONTHS_FULL[value.getMonth()]} ${beYear}`;
  }
  const str = String(value).trim();
  if (!str) return '';
  // Plausible Excel date serial range (~1954 to ~2994 AD/BE: 20000..400000)
  if (/^\d{5,6}(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (Number.isFinite(num) && num >= 20000 && num <= 400000) {
      return formatExcelSerialToThaiDate(num);
    }
  }
  return str;
}

/**
 * Resolve dynamic field value and {placeholder} substitutions consistently
 * across Visual Editor preview, server PNG/PDF renderer, and client batch PDF.
 */
export function resolveCertificateElementText(
  el: { elementType: string; fieldKey: string; defaultValue?: string | null },
  recipient: TextResolveRecipient,
  project: TextResolveProject
): string {
  const resolvedLocation = recipient.trainingLocation || project.location || '';
  const resolvedDate = normalizeThaiDateValue(recipient.trainingDate || project.eventDate || '');
  const resolvedSignedDate = normalizeThaiDateValue(recipient.signedDate || '');

  let text = '';
  if (el.elementType === 'dynamic') {
    if (el.fieldKey === 'certNumber') {
      text = recipient.certNumber || el.defaultValue || '';
    } else if (el.fieldKey === 'fullName') {
      text = recipient.fullName || el.defaultValue || '';
    } else if (el.fieldKey === 'nationalId') {
      text = recipient.nationalId || el.defaultValue || '';
    } else if (el.fieldKey === 'organization') {
      text = recipient.organization || el.defaultValue || '';
    } else if (el.fieldKey === 'note') {
      text = recipient.note || el.defaultValue || '';
    } else if (el.fieldKey === 'eventDate' || el.fieldKey === 'trainingDate') {
      text = resolvedDate || el.defaultValue || '';
    } else if (el.fieldKey === 'location' || el.fieldKey === 'trainingLocation') {
      text = resolvedLocation || el.defaultValue || '';
    } else if (el.fieldKey === 'signedDate') {
      text = resolvedSignedDate || el.defaultValue || '';
    } else {
      text = el.defaultValue || '';
    }
  } else {
    text = el.defaultValue || '';
  }

  return text
    .replace(/{certNumber}/g, recipient.certNumber || '')
    .replace(/{fullName}/g, recipient.fullName || '')
    .replace(/{nationalId}/g, recipient.nationalId || '')
    .replace(/{organization}/g, recipient.organization || '')
    .replace(/{note}/g, recipient.note || '')
    .replace(/{eventDate}/g, resolvedDate)
    .replace(/{trainingDate}/g, resolvedDate)
    .replace(/{location}/g, resolvedLocation)
    .replace(/{trainingLocation}/g, resolvedLocation)
    .replace(/{signedDate}/g, resolvedSignedDate)
    .replace(/{projectTitle}/g, project.title || '');
}
