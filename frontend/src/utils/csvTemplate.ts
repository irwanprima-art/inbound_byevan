/**
 * Download a CSV template (header row only) so users know the expected format.
 */
export function downloadCsvTemplate(headers: string[], filename: string) {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const content = bom + headers.join(',') + '\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Normalize a date string from various formats to YYYY-MM-DD.
 * Supports: YYYY/MM/DD, M/D/YYYY, MM/DD/YYYY, DD-MM-YYYY, DD/MM/YYYY (when day>12), etc.
 */
export function normalizeDate(value: string): string {
    if (!value) return value;
    const v = value.trim();
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // YYYY/MM/DD or YYYY.MM.DD
    const ymdMatch = v.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
    if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
    }
    // M/D/YYYY or MM/DD/YYYY or M-D-YYYY or MM-DD-YYYY or M.D.YYYY
    const mdyMatch = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (mdyMatch) {
        const a = parseInt(mdyMatch[1]);
        const b = parseInt(mdyMatch[2]);
        const year = mdyMatch[3];
        // If first number > 12, assume DD/MM/YYYY
        if (a > 12 && b <= 12) {
            return `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
        }
        // Otherwise assume M/D/YYYY (US format, common in Excel)
        return `${year}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    }
    return v;
}

/**
 * Normalize a datetime string: normalizes the date portion to YYYY-MM-DD,
 * and if only a date is given, appends 00:00:00.
 */
export function normalizeDateTime(value: string): string {
    if (!value) return value;
    const v = value.trim();
    // Check if it has a time part (space or T separator)
    const spaceIdx = v.indexOf(' ');
    const tIdx = v.indexOf('T');
    const sepIdx = spaceIdx > 0 ? spaceIdx : tIdx > 0 ? tIdx : -1;
    if (sepIdx > 0) {
        // Has time part — normalize only the date portion
        const datePart = normalizeDate(v.substring(0, sepIdx));
        const timePart = v.substring(sepIdx + 1);
        return `${datePart} ${timePart}`;
    }
    // Date only — normalize and append 00:00:00
    return normalizeDate(v) + ' 00:00:00';
}
