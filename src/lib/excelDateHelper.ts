import * as xlsx from 'xlsx';
import { normalizeThaiDateValue } from '@/lib/templateHelpers';

/**
 * Convert Excel Date cells (cell.t === 'd' or numeric date-formatted cells)
 * inside a SheetJS worksheet into readable Thai date strings ("14 พฤษภาคม 2569")
 * before reading rows with `sheet_to_json(..., { header: 1 })`.
 */
export function normalizeWorksheetDateCells(worksheet: xlsx.WorkSheet | undefined): void {
  if (!worksheet) return;
  for (const addr of Object.keys(worksheet)) {
    if (addr.startsWith('!')) continue;
    const cell = worksheet[addr] as xlsx.CellObject | undefined;
    if (!cell) continue;

    if (cell.t === 'd' && cell.v !== undefined) {
      const formatted = normalizeThaiDateValue(cell.v);
      if (formatted) {
        cell.t = 's';
        cell.v = formatted;
        cell.w = formatted;
      }
      continue;
    }

    if (
      cell.t === 'n' &&
      typeof cell.v === 'number' &&
      typeof cell.z === 'string' &&
      xlsx.SSF.is_date(cell.z)
    ) {
      const formatted = normalizeThaiDateValue(cell.v);
      if (formatted) {
        cell.t = 's';
        cell.v = formatted;
        cell.w = formatted;
      }
    }
  }
}
