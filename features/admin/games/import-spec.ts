import { CSV_COLUMNS, getAllCsvColumns } from '../../../types/csv-import';

export const CANONICAL_CSV_COLUMNS = getAllCsvColumns();
export const CANONICAL_CSV_HEADER = CANONICAL_CSV_COLUMNS.join(',');

export const CANONICAL_CSV_JSON_COLUMNS = [...CSV_COLUMNS.json] as const;

export type CanonicalCsvJsonColumn = (typeof CANONICAL_CSV_JSON_COLUMNS)[number];

export const CANONICAL_CSV_SCOPE_NOTE =
  'CSV är för bulk/massimport inom canonical header (basic/facilitated + participants-light). Behöver du artifacts eller triggers: använd JSON-import (Legendary/full fidelity).';
