#!/usr/bin/env node

/**
 * Guardrail script for supabase db push.
 *
 * Checks:
 * 1. Current git branch (warns if not main)
 * 2. Supabase CLI link target (shows which DB will be affected)
 * 3. Requires explicit confirmation before pushing to production
 *
 * Usage: node scripts/db-push-guard.mjs [--dry-run]
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { createInterface } from "readline";

const PRODUCTION_REF = "qohhnufxididbmzqnjwg";
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function main() {
  // 1. Git branch
  const branch = run("git branch --show-current");
  console.log(`📌 Git branch: ${branch}`);

  // 2. CLI link target
  let projectRef;
  try {
    projectRef = readFileSync("supabase/.temp/project-ref", "utf-8").trim();
  } catch {
    fail("No linked Supabase project. Run 'supabase link' first.");
  }

  const isProduction = projectRef === PRODUCTION_REF;
  console.log(`🗄️  Supabase target: ${projectRef}${isProduction ? " (PRODUCTION)" : ""}`);

  // 3. Branch check
  if (branch !== "main" && isProduction) {
    fail(
      `You are on branch '${branch}' but CLI is linked to PRODUCTION.\n` +
        `   Either switch to 'main' or re-link to a staging project.`
    );
  }

  // 4. Confirmation for production
  if (isProduction && !isDryRun) {
    console.log("\n⚠️  This will push migrations to PRODUCTION.");
    const ok = await confirm("Continue? [y/N] ");
    if (!ok) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  // 5. Run push
  const dryFlag = isDryRun ? " --dry-run" : "";
  console.log(`\n🚀 Running: supabase db push --include-all${dryFlag}\n`);

  try {
    execSync(`npx supabase db push --include-all${dryFlag}`, { stdio: "inherit" });
  } catch {
    process.exit(1);
  }
}

main();
