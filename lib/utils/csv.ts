/**
 * CSV Utilities
 * 
 * Generic functions for parsing and generating CSV files.
 * Handles proper escaping, quoting, and UTF-8 with BOM for Excel.
 */

// =============================================================================
// Types
// =============================================================================

export type CsvParseResult<T extends Record<string, string>> = {
  success: boolean;
  data: T[];
  headers: string[];
  errors: CsvParseError[];
};

export type CsvParseError = {
  row: number;
  column?: string;
  message: string;
};

export type CsvParseOptions = {
  /** Delimiter character (default: ',') */
  delimiter?: string;
  /** Whether first row is headers (default: true) */
  hasHeaders?: boolean;
  /** Skip empty rows (default: true) */
  skipEmpty?: boolean;
  /** Trim whitespace from values (default: true) */
  trimValues?: boolean;
};

// =============================================================================
// CSV Parsing
// =============================================================================

/**
 * Parse a CSV string into an array of objects.
 * Handles quoted fields, escaped quotes, and multiline values.
 */
export function parseCSV<T extends Record<string, string> = Record<string, string>>(
  csv: string,
  options: CsvParseOptions = {}
): CsvParseResult<T> {
  const {
    delimiter = ',',
    hasHeaders = true,
    skipEmpty = true,
    trimValues = true,
  } = options;

  const errors: CsvParseError[] = [];
  const rows: string[][] = [];
  
  // Remove BOM if present
  const content = csv.charCodeAt(0) === 0xFEFF ? csv.slice(1) : csv;
  
  // Parse CSV with proper quote handling
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let rowNumber = 1;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inQuotes) {
      // Non-standard but common: allow JSON-style backslash escaping inside quoted CSV fields.
      // Example: " inside a quoted cell.
      if (char === '\\' && nextChar === '"') {
        currentField += '"';
        i++; // Skip the escaped quote
        continue;
      }
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delimiter) {
        // End of field
        currentRow.push(trimValues ? currentField.trim() : currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        // Windows line ending
        currentRow.push(trimValues ? currentField.trim() : currentField);
        if (!skipEmpty || currentRow.some(f => f !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        rowNumber++;
        i++; // Skip \n
      } else if (char === '\n') {
        // Unix line ending
        currentRow.push(trimValues ? currentField.trim() : currentField);
        if (!skipEmpty || currentRow.some(f => f !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        rowNumber++;
      } else {
        currentField += char;
      }
    }
  }
  
  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(trimValues ? currentField.trim() : currentField);
    if (!skipEmpty || currentRow.some(f => f !== '')) {
      rows.push(currentRow);
    }
  }
  
  // Check for unclosed quotes
  if (inQuotes) {
    errors.push({
      row: rowNumber,
      message: 'Unclosed quote detected - ensure all quoted fields are properly closed',
    });
  }
  
  if (rows.length === 0) {
    return {
      success: false,
      data: [],
      headers: [],
      errors: [{ row: 0, message: 'No data found in CSV' }],
    };
  }
  
  // Extract headers
  const headers = hasHeaders ? rows[0] : rows[0].map((_, i) => `column_${i + 1}`);
  const dataRows = hasHeaders ? rows.slice(1) : rows;

  // Validate row widths. Extra columns usually mean an unescaped delimiter inside a value.
  // Example: a description containing a comma that is not wrapped in quotes.
  if (hasHeaders) {
    const expected = headers.length;
    for (let i = 0; i < dataRows.length; i++) {
      const actual = dataRows[i].length;
      if (actual > expected) {
        errors.push({
          row: i + 2, // +2 because headers are row 1
          message:
            `Row has ${actual} columns but header has ${expected}. This usually means a value contains an unescaped comma. Wrap values containing commas/newlines in double quotes.`,
        });
      }
    }
  }
  
  // Convert to objects
  const data: T[] = dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      obj[header] = row[colIndex] ?? '';
    });
    return obj as T;
  });
  
  return {
    success: errors.length === 0,
    data,
    headers,
    errors,
  };
}

// =============================================================================
// CSV Generation
// =============================================================================

/**
 * Escape a value for CSV.
 * Handles quotes, commas, and newlines.
 */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  let str: string;
  
  if (typeof value === 'object') {
    // Stringify objects (JSON columns)
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  
  // If value contains special characters, wrap in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    // Escape internal quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Generate a CSV string from an array of objects.
 */
export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: string[],
  options: { includeHeaders?: boolean; addBom?: boolean } = {}
): string {
  const { includeHeaders = true, addBom = true } = options;
  
  const rows: string[] = [];
  
  // Add header row
  if (includeHeaders) {
    rows.push(columns.map(col => escapeCsvValue(col)).join(','));
  }
  
  // Add data rows
  for (const item of data) {
    const row = columns.map(col => escapeCsvValue(item[col]));
    rows.push(row.join(','));
  }
  
  const csv = rows.join('\n');
  
  // Add BOM for Excel UTF-8 compatibility
  return addBom ? '\uFEFF' + csv : csv;
}

// =============================================================================
// JSON Validation Helpers
// =============================================================================

/**
 * Attempt to parse a JSON string from a CSV cell.
 * Returns parsed data or null with error details.
 */
export function parseJsonCell<T>(
  value: string | undefined,
  rowNumber: number,
  columnName: string
): { success: true; data: T } | { success: false; error: CsvParseError } {
  if (!value || value.trim() === '') {
    return { success: true, data: null as unknown as T };
  }
  
  try {
    const parsed = JSON.parse(value);
    return { success: true, data: parsed as T };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Invalid JSON';

    // Try to extract byte/char position from common V8/Node error messages.
    const posMatch = /position\s+(\d+)/i.exec(error);
    const position = posMatch ? Number(posMatch[1]) : null;

    const contextChars = 50;
    let contextInfo = '';
    if (typeof position === 'number' && Number.isFinite(position) && position >= 0) {
      const start = Math.max(0, position - contextChars);
      const end = Math.min(value.length, position + contextChars);
      const snippet = value.slice(start, end);

      const prefix = value.slice(0, position);
      const lines = prefix.split(/\r?\n/);
      const jsonLine = lines.length;
      const jsonColumn = lines[lines.length - 1]?.length ? lines[lines.length - 1]!.length + 1 : 1;

      contextInfo = ` Near position ${position} (line ${jsonLine}, col ${jsonColumn}): ${JSON.stringify(snippet)}`;
    }

    const guidance =
      ' Tips: JSON måste använda dubbla citattecken (\") och om JSON ligger i en CSV-cell måste alla \" i JSON skrivas som \"\" (dubbla citattecken) för att CSV ska vara giltig.';

    const trimmed = value.trim();
    const firstChar = trimmed[0];
    const looksLikeJson =
      firstChar === '{' ||
      firstChar === '[' ||
      firstChar === '"' ||
      trimmed === 'null' ||
      trimmed === 'true' ||
      trimmed === 'false' ||
      /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed);

    const columnShiftHint = looksLikeJson
      ? ''
      : ' Tips: Värdet ser inte ut som JSON (bör ofta börja med { eller [). Om du importerar CSV kan kolumnerna vara förskjutna pga saknade kommatecken för tomma fält — säkerställ att varje kolumn i headern har en plats i varje rad, även när cellen är tom.';

    return {
      success: false,
      error: {
        row: rowNumber,
        column: columnName,
        message: `Invalid JSON in ${columnName}: ${error}.${contextInfo}${guidance}${columnShiftHint}`,
      },
    };
  }
}

/**
 * Parse a comma-separated string into an array.
 * Handles semicolon as alternative separator.
 */
export function parseArrayString(value: string | undefined): string[] {
  if (!value || value.trim() === '') {
    return [];
  }
  
  // Try semicolon first (common in European locales)
  if (value.includes(';')) {
    return value.split(';').map(s => s.trim()).filter(Boolean);
  }
  
  // Fallback to comma
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Convert a string to a number, or null if invalid.
 */
export function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === '') {
    return null;
  }
  
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Convert a string to an integer, or null if invalid.
 */
export function parseInteger(value: string | undefined): number | null {
  const num = parseNumber(value);
  return num !== null ? Math.floor(num) : null;
}

/**
 * Convert a string to a boolean.
 */
export function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'ja';
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique game_key from a name.
 */
export function generateGameKey(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  
  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).slice(2, 6);
  
  return `${slug}-${suffix}`;
}

/**
 * Validate that a string is a valid UUID.
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Strip HTML tags from a string (basic sanitization).
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}
