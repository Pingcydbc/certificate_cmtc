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
