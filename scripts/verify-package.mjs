import { execSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";

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

// Read a named file out of a .tgz without any `tar` binary (Windows-safe).
function extractFromTarball(tgzPath, targetPath) {
  const compressed = fs.readFileSync(tgzPath);
  const data = gunzipSync(compressed);
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break; // end-of-archive sentinel
    const nameEnd = header.indexOf(0);
    const name = header.subarray(0, nameEnd === -1 ? 100 : nameEnd).toString("utf8");
    const sizeStr = header.subarray(124, 136).toString("utf8").replace(/\0/g, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    offset += 512;
    if (name === targetPath) {
      return data.subarray(offset, offset + size).toString("utf8");
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return null;
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

// ── Step 2: Prepare CLI-only manifest, then pack and inspect the real tarball ─
// We write the CLI-only package.json first, then pack with --ignore-scripts
// so npm bundles exactly what's on disk (no prepack double-strip confusion).
// We then extract package/package.json from the tarball itself — this is the
// ground truth for what npm publish would upload.
console.log("Packing and inspecting tarball...");
run("node scripts/prepare-cli-package-manifest.mjs");

let tarballPath = null;
const depErrors = [];

try {
  // Pack with --ignore-scripts: no prepack/postpack, so the tarball contains
  // exactly the CLI-only package.json we just wrote.
  const packRaw = run("npm pack --json --ignore-scripts");
  const packParsed = parsePackJson(packRaw);
  const pack = Array.isArray(packParsed) ? packParsed[0] : packParsed;
  tarballPath = pack?.filename ? path.resolve(pack.filename) : null;

  if (!tarballPath || !fs.existsSync(tarballPath)) {
    throw new Error(`npm pack did not produce a tarball. Output: ${packRaw.slice(0, 300)}`);
  }

  // ── File surface check ────────────────────────────────────────────────────
  const files = Array.isArray(pack?.files) ? pack.files.map((f) => f.path) : [];

  for (const file of REQUIRED_FILES) {
    if (!files.includes(file)) {
      depErrors.push(`Package missing required file: ${file}`);
    }
  }

  for (const file of files) {
    for (const pattern of FORBIDDEN_PATH_PATTERNS) {
      if (file.includes(pattern)) {
        depErrors.push(`Package contains forbidden artifact: ${file}`);
      }
    }
  }

  // ── Dependency surface check — read from the ACTUAL tarball ──────────────
  const packedManifestRaw = extractFromTarball(tarballPath, "package/package.json");
  if (!packedManifestRaw) {
    depErrors.push("Could not extract package/package.json from tarball.");
  } else {
    const packedManifest = JSON.parse(packedManifestRaw);
    const packedDeps = Object.keys(packedManifest.dependencies ?? {});

    const missing = EXPECTED_CLI_DEPS.filter((d) => !packedDeps.includes(d));
    if (missing.length > 0) {
      depErrors.push(`Missing expected CLI dependencies in tarball: ${missing.join(", ")}`);
    }

    const forbidden = packedDeps.filter((d) => FORBIDDEN_DEPS.includes(d));
    if (forbidden.length > 0) {
      depErrors.push(`Forbidden web dependencies found in tarball: ${forbidden.join(", ")}`);
    }

    const extra = packedDeps.filter(
      (d) => !EXPECTED_CLI_DEPS.includes(d) && !FORBIDDEN_DEPS.includes(d)
    );
    if (extra.length > 0) {
      depErrors.push(`Unexpected extra dependencies in tarball (not in expected or forbidden list): ${extra.join(", ")}`);
    }

    if (packedDeps.length !== EXPECTED_CLI_DEPS.length) {
      depErrors.push(
        `Dependency count mismatch in tarball. Expected ${EXPECTED_CLI_DEPS.length}, found ${packedDeps.length}: ${packedDeps.join(", ")}`
      );
    }

    if (depErrors.length === 0) {
      console.log(`  ✓ Tarball package.json verified: ${packedDeps.join(", ")}`);
    }
  }

  if (files.length > 0) {
    console.log(`  ✓ Files: ${files.length} files in package (${REQUIRED_FILES.length} required present)`);
  }
} finally {
  // Always restore the repository package.json — even if packing or verification failed.
  run("node scripts/restore-package-manifest.mjs");
  // Always delete the verification tarball.
  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }
}

if (depErrors.length > 0) {
  console.error("\nPackage verification FAILED:");
  for (const e of depErrors) console.error(`  ✖ ${e}`);
  process.exit(1);
}

console.log(`  ✓ No forbidden web dependencies`);
console.log("Package verification passed.");
