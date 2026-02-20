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
 * Normalize a datetime string: if only a date (YYYY-MM-DD) is given,
 * append 00:00:00. If already has time, keep as-is.
 */
export function normalizeDateTime(value: string): string {
    if (!value) return value;
    const v = value.trim();
    // Matches YYYY-MM-DD only (no time part)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + ' 00:00:00';
    return v;
}
