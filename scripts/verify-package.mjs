import { execSync } from "node:child_process";
import fs from "node:fs";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function parsePackJson(raw) {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  if (start === -1) {
    throw new Error(`Could not find npm pack JSON output in: ${trimmed.slice(0, 200)}`);
  }
  return JSON.parse(trimmed.slice(start));
}

// ── Expected CLI-only runtime dependencies ───────────────────────────────────
const EXPECTED_CLI_DEPS = [
  "chalk",
  "clipboardy",
  "commander",
  "execa",
  "nanoid",
  "ora",
  "prompts",
  "zod",
];

// ── Web/dashboard deps that must NEVER appear in the published package ────────
const FORBIDDEN_DEPS = [
  // React ecosystem
  "next",
  "react",
  "react-dom",
  "next-themes",
  // Motion / animation
  "framer-motion",
  "motion",
  // Radix UI
  "@radix-ui/react-accordion",
  "@radix-ui/react-avatar",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-label",
  "@radix-ui/react-progress",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-tooltip",
  "radix-ui",
  // Supabase
  "@supabase/ssr",
  "@supabase/supabase-js",
  // Remotion / video
  "@remotion/cli",
  "@remotion/player",
  "remotion",
  // Payment / email
  "resend",
  "dodopayments",
  // UI tooling
  "shadcn",
  "lucide-react",
  "sonner",
  "tailwind-merge",
  "tw-animate-css",
  "class-variance-authority",
  "clsx",
  // File globbing (web build tool, not needed in CLI runtime)
  "fast-glob",
];

// ── Required files in the published package ───────────────────────────────────
const REQUIRED_FILES = [
  "dist-cli/runtrim.cjs",
  "dist-cli/runtrim.js",
  "package.json",
  "README.md",
];

// ── Paths that must never appear in the published package ─────────────────────
const FORBIDDEN_PATH_PATTERNS = [
  ".env",
  ".env.local",
  ".runtrim/runs/",
  ".runtrim/executions/",
  ".runtrim/contracts/",
  ".runtrim/memory/",
  ".vercel/",
  "tmp/",
  "logs/",
];

// ── Step 1: Build and verify CLI ─────────────────────────────────────────────
console.log("Building CLI...");
run("npm run -s build:cli");
run("npm run -s verify:cli");

// ── Step 2: File surface check ────────────────────────────────────────────────
// Use --ignore-scripts so prepack/postpack don't fire here; file list is
// determined by the "files" field in package.json, not by dep content.
console.log("Checking package file surface...");
const dryRunRaw = run("npm pack --dry-run --json --ignore-scripts");
const dryRunParsed = parsePackJson(dryRunRaw);
const dryRun = Array.isArray(dryRunParsed) ? dryRunParsed[0] : dryRunParsed;
const files = Array.isArray(dryRun?.files) ? dryRun.files.map((f) => f.path) : [];

for (const file of REQUIRED_FILES) {
  if (!files.includes(file)) {
    throw new Error(`Package missing required file: ${file}`);
  }
}

for (const file of files) {
  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (file.includes(pattern)) {
      throw new Error(`Package contains forbidden artifact: ${file}`);
    }
  }
}

// ── Step 3: Dependency surface check ─────────────────────────────────────────
// Manually invoke prepare (same logic as prepack) to get the CLI-only manifest,
// read and verify it from disk, then always restore — even if verification fails.
// This avoids any dependency on tar or other platform-specific tools.
console.log("Checking published dependency surface...");
run("node scripts/prepare-cli-package-manifest.mjs");

const depErrors = [];

try {
  const cliPkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const cliDeps = Object.keys(cliPkg.dependencies ?? {});

  // Check expected deps are present
  const missing = EXPECTED_CLI_DEPS.filter((d) => !cliDeps.includes(d));
  if (missing.length > 0) {
    depErrors.push(`Missing expected CLI dependencies: ${missing.join(", ")}`);
  }

  // Check for forbidden web deps
  const forbidden = cliDeps.filter((d) => FORBIDDEN_DEPS.includes(d));
  if (forbidden.length > 0) {
    depErrors.push(`Forbidden web dependencies found in published manifest: ${forbidden.join(", ")}`);
  }

  // Check for unexpected extras not in either list
  const extra = cliDeps.filter(
    (d) => !EXPECTED_CLI_DEPS.includes(d) && !FORBIDDEN_DEPS.includes(d)
  );
  if (extra.length > 0) {
    depErrors.push(`Unexpected extra dependencies (not in expected or forbidden list): ${extra.join(", ")}`);
  }

  // Exact count check
  if (cliDeps.length !== EXPECTED_CLI_DEPS.length) {
    depErrors.push(
      `Dependency count mismatch. Expected ${EXPECTED_CLI_DEPS.length}, found ${cliDeps.length}: ${cliDeps.join(", ")}`
    );
  }
} finally {
  // Always restore — even if verification threw. Prevents leaving package.json
  // in a CLI-only state that would corrupt subsequent prepack runs.
  run("node scripts/restore-package-manifest.mjs");
}

if (depErrors.length > 0) {
  console.error("\nPackage verification FAILED:");
  for (const e of depErrors) console.error(`  ✖ ${e}`);
  process.exit(1);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`  ✓ Files: ${files.length} files in package (${REQUIRED_FILES.length} required present)`);
console.log(`  ✓ Dependencies: ${EXPECTED_CLI_DEPS.length} CLI-only (${EXPECTED_CLI_DEPS.join(", ")})`);
console.log(`  ✓ No forbidden web dependencies`);
console.log("Package verification passed.");
