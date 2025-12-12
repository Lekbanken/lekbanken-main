/**
 * Export utilities for admin data tables
 * Supports CSV and Excel (XLSX) export
 */

export type ExportFormat = 'csv' | 'xlsx';

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

export interface ExportOptions<T> {
  filename: string;
  data: T[];
  columns: ExportColumn<T>[];
  format?: ExportFormat;
}

/**
 * Get cell value from a row using column accessor
 */
function getCellValue<T>(row: T, column: ExportColumn<T>): string {
  let value: unknown;
  
  if (typeof column.accessor === 'function') {
    value = column.accessor(row);
  } else {
    value = row[column.accessor];
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Escape a value for CSV (handle quotes and commas)
 */
function escapeCsvValue(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert data to CSV string
 */
export function toCSV<T>(data: T[], columns: ExportColumn<T>[]): string {
  const headers = columns.map((col) => escapeCsvValue(col.header));
  const headerRow = headers.join(',');

  const rows = data.map((row) => {
    return columns
      .map((col) => escapeCsvValue(getCellValue(row, col)))
      .join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Download a string as a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV<T>(options: ExportOptions<T>): void {
  const csv = toCSV(options.data, options.columns);
  const filename = options.filename.endsWith('.csv') 
    ? options.filename 
    : `${options.filename}.csv`;
  
  // Add BOM for Excel UTF-8 compatibility
  const csvWithBom = '\uFEFF' + csv;
  
  downloadFile(csvWithBom, filename, 'text/csv;charset=utf-8');
}

/**
 * Export data as JSON and trigger download
 */
export function exportToJSON<T>(options: Omit<ExportOptions<T>, 'columns'>): void {
  const json = JSON.stringify(options.data, null, 2);
  const filename = options.filename.endsWith('.json')
    ? options.filename
    : `${options.filename}.json`;
  
  downloadFile(json, filename, 'application/json');
}

/**
 * Create a formatted date string for filenames
 */
export function getExportFilename(baseName: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${baseName}_${date}`;
}
