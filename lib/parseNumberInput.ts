/**
 * Parses user-typed numeric strings where the decimal separator may be `.` or `,`.
 * When both appear, the rightmost separator is treated as the decimal mark.
 */
export function parseNumberInput(raw: string): number {
  let s = raw.trim().replace(/[\s\u00A0\u202F]/g, '');
  if (s === '' || s === '-' || s === '+') return NaN;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // e.g. 1.234,56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. 1,234.56
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const commaCount = (s.match(/,/g) ?? []).length;
    if (commaCount === 1) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  return parseFloat(s);
}
