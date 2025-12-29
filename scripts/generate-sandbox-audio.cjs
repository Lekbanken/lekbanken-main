// Back-compat entrypoint (CommonJS) that runs the ESM implementation.
// Prefer: node scripts/generate-sandbox-audio.mjs

import('./generate-sandbox-audio.mjs').catch((err) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
