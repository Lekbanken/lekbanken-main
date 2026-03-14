/**
 * Lekbanken i18n audit (next-intl).
 *
 * Canonical locale: messages/sv.json
 * Compare against: messages/no.json, messages/en.json
 *
 * Usage:
 *   node scripts/i18n-audit.mjs
 *
 * Options:
 * - --out-md <path>       (default: i18n-audit.md)
 * - --out-json <path>     (default: i18n-audit.json)
 * - --config <path>       (default: scripts/i18n-audit.config.json) optional
 * - --baseline <path>     (default: scripts/i18n-audit-baseline.json)
 * - --write-baseline      write baseline JSON (counts) to --baseline path
 * - --ci                  fail on regressions vs baseline (missing/extra/placeholders/mismatches)
 * - --prefix <prefix>     restrict audit to keys starting with prefix (repeatable)
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const LOCALES_DIR = path.join(REPO_ROOT, "messages");

const CANONICAL = "sv";
const COMPARE = ["no", "en"];

// ASCII-only regexes where possible. We match both real Swedish chars and common mojibake sequences.
const SWEDISHISH_RE =
  /[\u00e5\u00e4\u00f6\u00c5\u00c4\u00d6]|\u00c3\u00a5|\u00c3\u00a4|\u00c3\u00b6|\u00c3\u0085|\u00c3\u0084|\u00c3\u0096/;
const MOJIBAKE_RE = /\u00c3.|[\u00e2\u0080\u0098-\u00e2\u0080\u009d]/; // "Ãx" or curly quotes mojibake
const PLACEHOLDER_RE = /\b(TODO|TBD|FIXME|TRANSLATE|MISSING)\b|^\?\?$|^\.\.\.$/i;

function parseArgs(argv) {
  const args = {
    outMd: path.join(REPO_ROOT, "i18n-audit.md"),
    outJson: path.join(REPO_ROOT, "i18n-audit.json"),
    configPath: path.join(REPO_ROOT, "scripts", "i18n-audit.config.json"),
    baselinePath: path.join(REPO_ROOT, "scripts", "i18n-audit-baseline.json"),
    prefixes: [],
    ci: false,
    writeBaseline: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out-md") args.outMd = path.resolve(REPO_ROOT, argv[++i] ?? args.outMd);
    else if (a === "--out-json") args.outJson = path.resolve(REPO_ROOT, argv[++i] ?? args.outJson);
    else if (a === "--config") args.configPath = path.resolve(REPO_ROOT, argv[++i] ?? args.configPath);
    else if (a === "--baseline") args.baselinePath = path.resolve(REPO_ROOT, argv[++i] ?? args.baselinePath);
    else if (a === "--prefix") args.prefixes.push(String(argv[++i] ?? "").trim());
    else if (a === "--ci") args.ci = true;
    else if (a === "--write-baseline") args.writeBaseline = true;
  }

  args.prefixes = args.prefixes.filter(Boolean);
  return args;
}

function readOptionalJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readJsonObject(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!isRecord(data)) throw new Error(`Expected JSON object: ${filePath}`);
  return data;
}

function flattenJson(value, prefix = "", out = new Map()) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    out.set(prefix, String(value));
    return out;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const key = prefix ? `${prefix}.${i}` : String(i);
      flattenJson(value[i], key, out);
    }
    return out;
  }
  if (isRecord(value)) {
    for (const [k, v] of Object.entries(value)) {
      const key = prefix ? `${prefix}.${k}` : k;
      flattenJson(v, key, out);
    }
  }
  return out;
}

function shorten(s, max = 110) {
  if (s == null) return "MISSING";
  const oneLine = String(s).replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 3)}...`;
}

function mdEscape(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function wildcardToRegex(pattern) {
  const escaped = String(pattern)
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAny(key, patterns) {
  for (const p of patterns ?? []) {
    if (!p) continue;
    if (wildcardToRegex(p).test(key)) return true;
  }
  return false;
}

function extractInterpolationVars(message) {
  const vars = new Set();

  // Mustache: {{name}}
  for (const m of String(message).matchAll(/{{\s*([\w.]+)\s*}}/g)) {
    if (m[1]) vars.add(m[1]);
  }

  // ICU: {var, ...}
  for (const m of String(message).matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\s*,/g)) {
    if (m[1]) vars.add(m[1]);
  }

  // Simple interpolation: {var}
  for (const m of String(message).matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
    if (m[1]) vars.add(m[1]);
  }

  return Array.from(vars).sort();
}

function setDiff(a, b) {
  const onlyA = [];
  const onlyB = [];
  for (const x of a) if (!b.has(x)) onlyA.push(x);
  for (const x of b) if (!a.has(x)) onlyB.push(x);
  onlyA.sort();
  onlyB.sort();
  return { onlyA, onlyB };
}

function looksPlaceholder(value) {
  const v = String(value ?? "").trim();
  if (!v) return true;
  if (PLACEHOLDER_RE.test(v)) return true;
  return false;
}

function looksProbablyUntranslated(target, sv, locale) {
  const t = String(target).trim();
  const s = String(sv).trim();

  // Exact equals for non-trivial strings is suspicious.
  if (t === s && s.length >= 12) return true;

  // Swedish-ish signals in en/no.
  if (locale === "en") {
    if (SWEDISHISH_RE.test(t)) return true;
    if (/\b(och|inte|klicka|kunde|försök|lägg\s*till|ta\s*bort|spara|behör)\b/i.test(t)) return true;
  }
  if (locale === "no") {
    // Bokmal normally does not use "ä/ö".
    if (/[\u00e4\u00f6\u00c4\u00d6]/.test(t)) return true;
    if (/\b(och|inte|försök|lägg\s*till|ta\s*bort)\b/i.test(t)) return true;
  }

  return false;
}

function loadLocales() {
  const files = {
    sv: path.join(LOCALES_DIR, "sv.json"),
    no: path.join(LOCALES_DIR, "no.json"),
    en: path.join(LOCALES_DIR, "en.json"),
  };
  for (const fp of Object.values(files)) {
    if (!fs.existsSync(fp)) throw new Error(`Missing locale file: ${fp}`);
  }
  return {
    sv: flattenJson(readJsonObject(files.sv)),
    no: flattenJson(readJsonObject(files.no)),
    en: flattenJson(readJsonObject(files.en)),
  };
}

function filterByPrefixes(keys, prefixes) {
  if (!prefixes?.length) return keys;
  return keys.filter((k) => prefixes.some((p) => k.startsWith(p)));
}

function renderTable(title, rows) {
  const header =
    `### ${title}\n\n` +
    `| key | sv | no | en | notes |\n` +
    `|---|---|---|---|---|\n`;
  const body = rows
    .map((r) => {
      const notes = r.notes ? mdEscape(r.notes) : "";
      return `| \`${mdEscape(r.key)}\` | ${mdEscape(shorten(r.sv))} | ${mdEscape(shorten(r.no))} | ${mdEscape(shorten(r.en))} | ${notes} |`;
    })
    .join("\n");
  return header + body + "\n\n";
}

function collectTranslationUsage() {
  const roots = ["app", "components", "features", "lib", "hooks"];
  const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
  const usedExact = new Set();
  const usedWildcards = [];

  const files = [];
  for (const r of roots) {
    const abs = path.join(REPO_ROOT, r);
    if (!fs.existsSync(abs)) continue;
    const stack = [abs];
    while (stack.length) {
      const dir = stack.pop();
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "messages" || ent.name === "docs" || ent.name === "supabase") continue;
          stack.push(p);
        } else if (ent.isFile()) {
          if (!exts.has(path.extname(ent.name))) continue;
          files.push(p);
        }
      }
    }
  }

  for (const fp of files) {
    const rel = path.relative(REPO_ROOT, fp);
    if (rel.startsWith(`scripts${path.sep}`)) continue;
    if (rel.startsWith(`tests${path.sep}`)) continue;
    if (rel.startsWith(`messages${path.sep}`)) continue;
    if (rel.startsWith(`docs${path.sep}`)) continue;
    if (rel.includes(`${path.sep}.next${path.sep}`)) continue;

    const src = fs.readFileSync(fp, "utf8");

    const varToNs = new Map();
    for (const m of src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*(['"`])([^'"`]+)\2\s*\)/g)) varToNs.set(m[1], m[3]);
    for (const m of src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+getTranslations\(\s*(['"`])([^'"`]+)\2\s*\)/g)) varToNs.set(m[1], m[3]);
    for (const m of src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*\)/g)) varToNs.set(m[1], null);

    for (const [varName, ns] of varToNs.entries()) {
      const exactRe = new RegExp(`${varName}\\(\\s*['\\"]([^'\\"]+)['\\"]`, "g");
      for (const m of src.matchAll(exactRe)) {
        const relKey = m[1];
        const full = ns ? `${ns}.${relKey}` : relKey;
        usedExact.add(full);
      }
      const tplRe = new RegExp(`${varName}\\(\\s*\\\`([^\\\`]+)\\\``, "g");
      for (const m of src.matchAll(tplRe)) {
        const raw = m[1];
        if (!raw.includes("${")) {
          usedExact.add(ns ? `${ns}.${raw}` : raw);
          continue;
        }
        usedWildcards.push({ namespace: ns, pattern: raw.replace(/\$\{[^}]+\}/g, "*") });
      }
    }
  }

  return { usedExact, usedWildcards };
}

function isUsedKey(key, usage) {
  if (usage.usedExact.has(key)) return true;
  for (const w of usage.usedWildcards) {
    const pattern = w.namespace ? `${w.namespace}.${w.pattern}` : w.pattern;
    if (wildcardToRegex(pattern).test(key)) return true;
  }
  return false;
}

function scanHardcodedActionableStrings() {
  const roots = ["app", "components", "features", "lib"];
  const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);

  const patterns = [
    { id: "confirm", re: /\bconfirm\(\s*(['"])([^'"]+)\1/g },
    { id: "alert", re: /\balert\(\s*(['"])([^'"]+)\1/g },
    { id: "new_error", re: /\bnew Error\(\s*(['"])([^'"]+)\1/g },
    { id: "throw_error", re: /\bthrow new Error\(\s*(['"])([^'"]+)\1/g },
    { id: "api_error", re: /NextResponse\.json\(\s*{[^}]*\berror:\s*(['"])([^'"]+)\1/g },
  ];

  const files = [];
  for (const r of roots) {
    const abs = path.join(REPO_ROOT, r);
    if (!fs.existsSync(abs)) continue;
    const stack = [abs];
    while (stack.length) {
      const dir = stack.pop();
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "messages" || ent.name === "docs") continue;
          stack.push(p);
        } else if (ent.isFile()) {
          if (!exts.has(path.extname(ent.name))) continue;
          files.push(p);
        }
      }
    }
  }

  const findings = [];
  const countsByFile = new Map();

  for (const fp of files) {
    const rel = path.relative(REPO_ROOT, fp).replace(/\\/g, "/");
    const src = fs.readFileSync(fp, "utf8");
    const lines = src.split(/\r?\n/);

    // char index -> line number
    const lineStarts = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
    const indexToLine = (idx) => {
      let lo = 0;
      let hi = lineStarts.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const start = lineStarts[mid];
        const next = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Number.POSITIVE_INFINITY;
        if (idx >= start && idx < next) return mid + 1;
        if (idx < start) hi = mid - 1;
        else lo = mid + 1;
      }
      return 1;
    };

    let countInFile = 0;
    for (const p of patterns) {
      for (const m of src.matchAll(p.re)) {
        const msg = m[2];
        if (!msg) continue;
        const line = indexToLine(m.index ?? 0);
        const preview = (lines[line - 1] ?? "").trim().slice(0, 220);
        findings.push({ file: rel, line, kind: p.id, message: msg, preview });
        countInFile += 1;
      }
    }
    if (countInFile) countsByFile.set(rel, (countsByFile.get(rel) ?? 0) + countInFile);
  }

  findings.sort((a, b) => (a.file !== b.file ? a.file.localeCompare(b.file) : a.line - b.line));
  const topFiles = Array.from(countsByFile.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 25)
    .map(([file, count]) => ({ file, count }));

  return { total: findings.length, sample: findings.slice(0, 200), topFiles, countsByFile };
}

function normalizeRelPath(p) {
  return String(p ?? "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "");
}

function fileMatchesGroup(file, group) {
  const f = normalizeRelPath(file);
  const includes = (group?.includePrefixes ?? []).map(normalizeRelPath).filter(Boolean);
  const excludes = (group?.excludePrefixes ?? []).map(normalizeRelPath).filter(Boolean);

  if (!includes.length) return false;
  if (!includes.some((p) => f.startsWith(p))) return false;
  if (excludes.some((p) => f.startsWith(p))) return false;
  return true;
}

function computeHardcodedActionableByGroup(countsByFile, groups) {
  const out = {};
  const gs = Array.isArray(groups) ? groups : [];
  for (const g of gs) {
    if (!g?.id) continue;
    if (g.enabled === false) continue;
    out[g.id] = 0;
  }

  if (!countsByFile || typeof countsByFile.entries !== "function") return out;
  for (const [file, count] of countsByFile.entries()) {
    for (const g of gs) {
      if (!g?.id) continue;
      if (g.enabled === false) continue;
      if (!fileMatchesGroup(file, g)) continue;
      out[g.id] = (out[g.id] ?? 0) + (Number(count) || 0);
    }
  }

  return out;
}

function topDuplicates(flat) {
  const byVal = new Map();
  for (const [k, v] of flat.entries()) {
    const vv = String(v).trim();
    if (vv.length < 20) continue;
    const list = byVal.get(vv) ?? [];
    list.push(k);
    byVal.set(vv, list);
  }
  return Array.from(byVal.entries())
    .filter(([, keys]) => keys.length >= 6)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .map(([value, keys]) => ({ value, keys: keys.slice().sort() }));
}

function countMojibake(flat) {
  let n = 0;
  for (const v of flat.values()) if (MOJIBAKE_RE.test(v)) n++;
  return n;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(LOCALES_DIR)) throw new Error(`No locales dir found at ${LOCALES_DIR}`);

  const config = readOptionalJson(args.configPath, {
    allowIdentical: [],
    allowMissing: [],
    allowExtra: [],
    allowPlaceholder: [],
  });

  const locales = loadLocales();

  const svAll = Array.from(locales.sv.keys());
  const noAll = Array.from(locales.no.keys());
  const enAll = Array.from(locales.en.keys());

  const svKeys = new Set(filterByPrefixes(svAll, args.prefixes));
  const noKeys = new Set(filterByPrefixes(noAll, args.prefixes));
  const enKeys = new Set(filterByPrefixes(enAll, args.prefixes));

  const missingInNo = Array.from(svKeys).filter((k) => !noKeys.has(k) && !matchesAny(k, config.allowMissing));
  const missingInEn = Array.from(svKeys).filter((k) => !enKeys.has(k) && !matchesAny(k, config.allowMissing));
  const extraInNo = Array.from(noKeys).filter((k) => !svKeys.has(k) && !matchesAny(k, config.allowExtra));
  const extraInEn = Array.from(enKeys).filter((k) => !svKeys.has(k) && !matchesAny(k, config.allowExtra));

  const emptyOrPlaceholder = new Set();
  for (const k of svKeys) {
    const no = locales.no.get(k);
    const en = locales.en.get(k);
    if (no != null && (looksPlaceholder(no) || String(no).trim() === k) && !matchesAny(k, config.allowPlaceholder)) emptyOrPlaceholder.add(k);
    if (en != null && (looksPlaceholder(en) || String(en).trim() === k) && !matchesAny(k, config.allowPlaceholder)) emptyOrPlaceholder.add(k);
  }

  const interpolationMismatch = [];
  for (const k of svKeys) {
    const sv = locales.sv.get(k);
    if (!sv) continue;
    const svVars = new Set(extractInterpolationVars(sv));
    for (const loc of COMPARE) {
      const v = locales[loc].get(k);
      if (!v) continue;
      const vars = new Set(extractInterpolationVars(v));
      const d = setDiff(svVars, vars);
      if (d.onlyA.length || d.onlyB.length) {
        interpolationMismatch.push({
          key: k,
          sv,
          no: locales.no.get(k) ?? null,
          en: locales.en.get(k) ?? null,
          notes: `no: sv-only=[${d.onlyA.join(", ")}] loc-only=[${d.onlyB.join(", ")}]`,
        });
        break;
      }
    }
  }

  const probablyUntranslated = [];
  for (const k of svKeys) {
    if (matchesAny(k, config.allowIdentical)) continue;
    const sv = locales.sv.get(k);
    if (!sv) continue;
    const no = locales.no.get(k);
    const en = locales.en.get(k);
    if (no && looksProbablyUntranslated(no, sv, "no")) probablyUntranslated.push(k);
    else if (en && looksProbablyUntranslated(en, sv, "en")) probablyUntranslated.push(k);
  }

  const usage = collectTranslationUsage();
  const unused = Array.from(svKeys).filter((k) => !isUsedKey(k, usage));

  const hardcodedActionable = scanHardcodedActionableStrings();
  const hardcodedActionableByGroup = computeHardcodedActionableByGroup(
    hardcodedActionable.countsByFile,
    config.hardcodedActionableEnforcement?.groups
  );

  const metrics = {
    keys: { sv: svKeys.size, no: noKeys.size, en: enKeys.size },
    missing: { no: missingInNo.length, en: missingInEn.length },
    extra: { no: extraInNo.length, en: extraInEn.length },
    placeholder: emptyOrPlaceholder.size,
    interpolationMismatch: interpolationMismatch.length,
    probablyUntranslated: probablyUntranslated.length,
    unused: unused.length,
    hardcodedActionable: { total: hardcodedActionable.total, byGroup: hardcodedActionableByGroup },
    mojibake: {
      sv: countMojibake(locales.sv),
      no: countMojibake(locales.no),
      en: countMojibake(locales.en),
    },
    scopePrefixes: args.prefixes,
  };

  // Baseline / CI guard
  const baseline = readOptionalJson(args.baselinePath, null);
  if (args.writeBaseline) {
    fs.mkdirSync(path.dirname(args.baselinePath), { recursive: true });
    fs.writeFileSync(
      args.baselinePath,
      JSON.stringify({ createdAt: new Date().toISOString(), metrics }, null, 2) + "\n",
      "utf8"
    );
  }

  if (args.ci) {
    if (!baseline?.metrics) {
      console.error(`Missing baseline metrics at ${args.baselinePath}. Run with --write-baseline first.`);
      process.exit(2);
    }

    const failures = [];
    const b = baseline.metrics;
    const m = metrics;

    const cmp = (name, cur, prev) => {
      if (typeof cur === "number" && typeof prev === "number" && cur > prev) failures.push(`${name}: ${cur} > ${prev}`);
    };

    cmp("missing.no", m.missing.no, b.missing?.no);
    cmp("missing.en", m.missing.en, b.missing?.en);
    cmp("extra.no", m.extra.no, b.extra?.no);
    cmp("extra.en", m.extra.en, b.extra?.en);
    cmp("placeholder", m.placeholder, b.placeholder);
    cmp("interpolationMismatch", m.interpolationMismatch, b.interpolationMismatch);

    // Staged enforcement: hardcoded actionable strings by folder group (opt-in via config)
    const enforcedGroups = config.hardcodedActionableEnforcement?.groups ?? [];
    for (const g of enforcedGroups) {
      if (!g?.id) continue;
      if (g.enabled === false) continue;

      const cur = m.hardcodedActionable?.byGroup?.[g.id];
      const prev = b.hardcodedActionable?.byGroup?.[g.id];

      if (typeof prev !== "number") {
        failures.push(`baseline missing hardcodedActionable.byGroup.${g.id} (run npm run i18n:baseline)`);
        continue;
      }
      if (typeof cur === "number" && cur > prev) failures.push(`hardcodedActionable.byGroup.${g.id}: ${cur} > ${prev}`);
    }

    if (failures.length) {
      console.error("i18n CI regression detected:");
      for (const f of failures) console.error(`- ${f}`);
      process.exit(1);
    }
  }

  // JSON output (for CI / dashboards)
  fs.writeFileSync(
    args.outJson,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        canonical: CANONICAL,
        compare: COMPARE,
        metrics,
        topFiles: { hardcodedActionable: hardcodedActionable.topFiles },
        interpolationMismatch: interpolationMismatch.slice().sort((a, b) => a.key.localeCompare(b.key)).slice(0, 50),
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  // Markdown report
  const sections = [];
  sections.push("# i18n Audit (next-intl)\n");
  sections.push("## Summary\n\n");
  sections.push(`- Canonical locale: \`${CANONICAL}\` (messages/sv.json)\n`);
  sections.push(`- Compared locales: \`no\`, \`en\`\n`);
  if (args.prefixes.length) sections.push(`- Scope: keys starting with ${args.prefixes.map((p) => `\`${p}\``).join(", ")}\n`);
  sections.push(`- Total keys (flattened): sv=${metrics.keys.sv}, no=${metrics.keys.no}, en=${metrics.keys.en}\n`);
  sections.push(`- Missing keys: no=${metrics.missing.no}, en=${metrics.missing.en}\n`);
  sections.push(`- Extra keys: no=${metrics.extra.no}, en=${metrics.extra.en}\n`);
  sections.push(`- Empty/placeholder values (no/en): ${metrics.placeholder}\n`);
  sections.push(`- Interpolation mismatches: ${metrics.interpolationMismatch}\n`);
  sections.push(`- Probably untranslated (heuristic): ${metrics.probablyUntranslated}\n`);
  sections.push(`- Unused sv keys (candidates): ${metrics.unused}\n`);
  sections.push(`- Hardcoded actionable strings (confirm/error patterns): ${metrics.hardcodedActionable.total}\n`);
  if (metrics.hardcodedActionable.byGroup && Object.keys(metrics.hardcodedActionable.byGroup).length) {
    const parts = Object.entries(metrics.hardcodedActionable.byGroup)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, n]) => `${id}=${n}`);
    sections.push(`- Hardcoded actionable (enforcement groups): ${parts.join(", ")}\n`);
  }
  sections.push(`- Mojibake-like strings (possible encoding issues): sv=${metrics.mojibake.sv}, no=${metrics.mojibake.no}, en=${metrics.mojibake.en}\n\n`);
  sections.push("Re-run:\n");
  sections.push("```bash\n");
  sections.push("node scripts/i18n-audit.mjs\n");
  sections.push("```\n\n");

  sections.push("## Locale Structure\n\n");
  sections.push("- next-intl request config: `lib/i18n/request.ts` (loads `messages/{locale}.json`)\n");
  sections.push("- Supported locales: `sv`, `en`, `no` (see `lib/i18n/config.ts`)\n");
  sections.push("- Messages files:\n");
  sections.push("  - `messages/sv.json`\n");
  sections.push("  - `messages/no.json`\n");
  sections.push("  - `messages/en.json`\n\n");

  sections.push("## Key Diffs\n\n");

  const mkRows = (keys, notesFn) =>
    keys
      .slice()
      .sort()
      .map((k) => ({
        key: k,
        sv: locales.sv.get(k) ?? null,
        no: locales.no.get(k) ?? null,
        en: locales.en.get(k) ?? null,
        notes: notesFn ? notesFn(k) : undefined,
      }));

  sections.push(renderTable(`A) Missing keys in no (present in sv, absent in no) (${missingInNo.length})`, mkRows(missingInNo)));
  sections.push(renderTable(`B) Missing keys in en (present in sv, absent in en) (${missingInEn.length})`, mkRows(missingInEn)));
  sections.push(renderTable(`C) Extra keys in no (present in no, absent in sv) (${extraInNo.length})`, mkRows(extraInNo)));
  sections.push(renderTable(`D) Extra keys in en (present in en, absent in sv) (${extraInEn.length})`, mkRows(extraInEn)));

  const emptyRows = mkRows(Array.from(emptyOrPlaceholder), (k) => {
    const notes = [];
    const no = locales.no.get(k);
    const en = locales.en.get(k);
    if (no != null && looksPlaceholder(no)) notes.push("no placeholder/empty");
    if (en != null && looksPlaceholder(en)) notes.push("en placeholder/empty");
    if (no != null && String(no).trim() === k) notes.push("no == key");
    if (en != null && String(en).trim() === k) notes.push("en == key");
    return notes.join("; ");
  });
  sections.push(renderTable(`E) Empty values / placeholders in no/en (${emptyRows.length})`, emptyRows));

  sections.push(renderTable(`F) Interpolation mismatch (${interpolationMismatch.length})`, interpolationMismatch));

  const untransRows = mkRows(probablyUntranslated, (k) => {
    const sv = locales.sv.get(k);
    const no = locales.no.get(k);
    const en = locales.en.get(k);
    const notes = [];
    if (sv && no && String(no).trim() === String(sv).trim()) notes.push("no == sv");
    if (sv && en && String(en).trim() === String(sv).trim()) notes.push("en == sv");
    if (en && SWEDISHISH_RE.test(en)) notes.push("en swedish-ish");
    if (no && /[\u00e4\u00f6\u00c4\u00d6]/.test(no)) notes.push("no contains a/oe (sv)");
    return notes.join("; ");
  });
  sections.push(renderTable(`G) Probably untranslated (heuristics) (${untransRows.length})`, untransRows));

  sections.push("## Hardcoded Strings (confirm/error patterns)\n\n");
  sections.push(`Total: ${hardcodedActionable.total}. Sample: ${hardcodedActionable.sample.length}.\n\n`);
  sections.push("| file | line | kind | message | code preview |\n");
  sections.push("|---|---:|---|---|---|\n");
  sections.push(
    hardcodedActionable.sample
      .map((f) => `| \`${mdEscape(f.file)}\` | ${f.line} | \`${mdEscape(f.kind)}\` | ${mdEscape(shorten(f.message, 140))} | ${mdEscape(shorten(f.preview, 140))} |`)
      .join("\n") + "\n\n"
  );
  sections.push("Top files by count:\n\n");
  for (const t of hardcodedActionable.topFiles) sections.push(`- \`${t.file}\`: ${t.count}\n`);
  sections.push("\n");

  sections.push("## Unused Translation Keys (candidates)\n\n");
  sections.push(
    "These are keys present in sv that were not found via static scanning of useTranslations/getTranslations usage. " +
      "Dynamic keys and indirect access may cause false positives.\n\n"
  );
  sections.push(`Count: ${unused.length}\n\n`);
  const unusedSorted = unused.slice().sort();
  for (const k of unusedSorted.slice(0, 500)) sections.push(`- \`${k}\`\n`);
  if (unusedSorted.length > 500) sections.push(`- ... (${unusedSorted.length - 500} more)\n`);
  sections.push("\n");

  sections.push("## Suspicious Duplicates (within locale)\n\n");
  const dups = { sv: topDuplicates(locales.sv), no: topDuplicates(locales.no), en: topDuplicates(locales.en) };
  for (const loc of ["sv", "no", "en"]) {
    sections.push(`### ${loc}\n\n`);
    if (!dups[loc].length) {
      sections.push("No duplicate blocks detected (threshold: >=6 keys, value length >=20).\n\n");
      continue;
    }
    for (const d of dups[loc]) {
      sections.push(`- Value (${d.keys.length} keys): ${shorten(d.value, 120)}\n`);
      sections.push(`  Keys: ${d.keys.slice(0, 12).map((k) => `\`${k}\``).join(", ")}${d.keys.length > 12 ? ", ..." : ""}\n`);
    }
    sections.push("\n");
  }

  sections.push("## Recommendations\n\n");
  sections.push("1. Stop regressions: run this script in CI with --ci and a baseline file.\n");
  sections.push("2. Fix interpolation mismatches first (runtime safety), then missing keys, then hardcoded strings by module.\n");
  sections.push("3. Consider a temporary copy-forward strategy for missing keys (sv -> no/en) and mark for translation.\n");
  sections.push("4. Clean up extra keys once a module is stable (use unused + extra cross-check).\n");
  sections.push("5. If mojibake counts are high, prioritize encoding cleanup of messages/*.json.\n\n");

  fs.writeFileSync(args.outMd, sections.join(""), "utf8");
  console.log(`Wrote report: ${path.relative(REPO_ROOT, args.outMd).replace(/\\\\/g, "/")}`);
  console.log(`Wrote json:   ${path.relative(REPO_ROOT, args.outJson).replace(/\\\\/g, "/")}`);
}

main();
