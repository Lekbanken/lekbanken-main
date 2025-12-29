import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { CANONICAL_CSV_HEADER } from '../features/admin/games/import-spec';

const DOC_PATH = path.join(process.cwd(), 'docs', 'CSV_IMPORT_FIELD_REFERENCE.md');

const START = '<!-- CANONICAL_CSV_HEADER_START -->';
const END = '<!-- CANONICAL_CSV_HEADER_END -->';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const doc = fs.readFileSync(DOC_PATH, 'utf8');
const startIndex = doc.indexOf(START);
const endIndex = doc.indexOf(END);

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  fail(
    `Could not find canonical header markers in ${DOC_PATH}.\n` +
      `Add the markers:\n${START}\n...header...\n${END}`
  );
}

const between = doc.slice(startIndex + START.length, endIndex).trim();

// Allow either a fenced code block or plain text between markers.
const fencedMatch = between.match(/```csv\s*([\s\S]*?)\s*```/i);
const documentedHeader = (fencedMatch ? fencedMatch[1] : between)
  .trim()
  .replace(/^\uFEFF/, '')
  .replace(/[\r\n]+/g, '')
  .trim();

const canonical = CANONICAL_CSV_HEADER.trim();

if (documentedHeader !== canonical) {
  console.error('CSV header drift detected between docs and code.');
  console.error('\nDocs header:\n' + documentedHeader);
  console.error('\nCode header:\n' + canonical);
  process.exit(1);
}

console.log('OK: docs canonical CSV header matches getAllCsvColumns().');
