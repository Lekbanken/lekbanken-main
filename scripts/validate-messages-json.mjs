import fs from 'node:fs';
import path from 'node:path';

const messagesDir = path.resolve(process.cwd(), 'messages');

function positionToLineCol(text, pos) {
  // pos is 0-based character offset
  let line = 1;
  let lastLineStart = 0;
  for (let i = 0; i < text.length && i < pos; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line++;
      lastLineStart = i + 1;
    }
  }
  const col = pos - lastLineStart + 1;
  return { line, col };
}

function extractJsonErrorPosition(message) {
  // Node typically: "... in JSON at position 123" (v16+)
  const match = /at position (\d+)/i.exec(message);
  if (!match) return null;
  return Number(match[1]);
}

if (!fs.existsSync(messagesDir)) {
  console.error(`Missing folder: ${messagesDir}`);
  process.exit(2);
}

const files = fs
  .readdirSync(messagesDir)
  .filter((f) => f.toLowerCase().endsWith('.json'))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  console.log('No JSON files found under messages/.');
  process.exit(0);
}

let failed = 0;
for (const file of files) {
  const fullPath = path.join(messagesDir, file);
  const text = fs.readFileSync(fullPath, 'utf8');

  try {
    JSON.parse(text);
    console.log(`OK  messages/${file}`);
  } catch (err) {
    failed++;
    const message = err && typeof err.message === 'string' ? err.message : String(err);
    const pos = extractJsonErrorPosition(message);
    if (Number.isFinite(pos) && pos !== null) {
      const { line, col } = positionToLineCol(text, pos);
      console.error(`ERR messages/${file} (${line}:${col}) ${message}`);
    } else {
      console.error(`ERR messages/${file} ${message}`);
    }
  }
}

process.exit(failed ? 1 : 0);
