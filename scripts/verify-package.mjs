import { execSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function parsePackJson(raw) {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  if (start === -1) {
    throw new Error(`Could not find npm pack JSON output in: ${trimmed.slice(0, 300)}`);
  }
  return JSON.parse(trimmed.slice(start));
}

// Read a named entry out of a .tgz without any `tar` binary (Windows-safe, pure Node).
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

// Count installed packages under node_modules, including scoped packages.
function countInstalledPackages(nodeModulesDir) {
  if (!fs.existsSync(nodeModulesDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(nodeModulesDir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(nodeModulesDir, entry);
    try {
      if (!fs.statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    if (entry.startsWith("@")) {
      // Scoped package dir — count each named child
      try {
        for (const scoped of fs.readdirSync(full)) {
          if (!scoped.startsWith(".")) count++;
        }
      } catch { /* ignore unreadable scope dirs */ }
    } else {
      count++;
    }
  }
  return count;
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
  "next", "react", "react-dom", "next-themes",
  "framer-motion", "motion",
  "@radix-ui/react-accordion", "@radix-ui/react-avatar", "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu", "@radix-ui/react-label", "@radix-ui/react-progress",
  "@radix-ui/react-select", "@radix-ui/react-separator", "@radix-ui/react-slot",
  "@radix-ui/react-switch", "@radix-ui/react-tabs", "@radix-ui/react-tooltip", "radix-ui",
  "@supabase/ssr", "@supabase/supabase-js",
  "@remotion/cli", "@remotion/player", "remotion",
  "resend", "dodopayments",
  "shadcn", "lucide-react", "sonner", "tailwind-merge", "tw-animate-css",
  "class-variance-authority", "clsx", "fast-glob",
];

// ── Forbidden scoped package prefixes (catches entire families) ───────────────
const FORBIDDEN_PREFIXES = [
  "@radix-ui/",
  "@remotion/",
  "@supabase/",
  "@vercel/",
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
  ".env", ".env.local",
  ".runtrim/runs/", ".runtrim/executions/", ".runtrim/contracts/", ".runtrim/memory/",
  ".vercel/", "tmp/", "logs/",
];

// ── Maximum installed packages allowed (CLI deps + transitive, not web deps) ──
// Actual CLI-only install is ~62 packages. Web deps produce 665+.
// Threshold is set at 100 to give headroom for minor dep updates while still
// catching any web dep bleed (which would jump the count above 100 immediately).
const MAX_INSTALLED_PACKAGES = 100;

// ── Step 1: Build and verify CLI ─────────────────────────────────────────────
console.log("Building CLI...");
run("npm run -s build:cli");
run("npm run -s verify:cli");

// ── Step 2: Prepare CLI-only manifest ────────────────────────────────────────
console.log("Preparing CLI-only manifest...");
run("node scripts/prepare-cli-package-manifest.mjs");

// Compute tarball filename BEFORE packing — npm always produces {name}-{version}.tgz.
// We do NOT rely on pack.filename from the JSON output because npm propagates
// npm_config_dry_run=true to child processes during `npm publish --dry-run`,
// which causes npm pack to return JSON without a filename field.
const cliPkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const tarballName = `${cliPkg.name}-${cliPkg.version}.tgz`;
const tarballPath = path.resolve(tarballName);

const depErrors = [];
let files = [];

try {
  // ── Step 3: File surface check (dry-run, fast, no tarball on disk) ─────────
  console.log("Checking package file surface...");
  const dryRunRaw = run("npm pack --dry-run --json --ignore-scripts");
  const dryRun = Array.isArray(parsePackJson(dryRunRaw))
    ? parsePackJson(dryRunRaw)[0]
    : parsePackJson(dryRunRaw);
  files = Array.isArray(dryRun?.files) ? dryRun.files.map((f) => f.path) : [];

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

  // ── Step 4: Create real tarball and inspect its package.json ───────────────
  // --ignore-scripts: prevent prepack from running again (we already prepared).
  // We read the tarball bytes directly so no `tar` binary is needed on Windows.
  // If npm_config_dry_run is inherited, npm pack may not write to disk — we
  // detect this and fall back to the on-disk package.json check.
  console.log("Creating tarball for inspection...");
  run("npm pack --ignore-scripts");

  if (fs.existsSync(tarballPath)) {
    const packedManifestRaw = extractFromTarball(tarballPath, "package/package.json");
    if (!packedManifestRaw) {
      depErrors.push("Could not extract package/package.json from tarball.");
    } else {
      const packedDeps = Object.keys(JSON.parse(packedManifestRaw).dependencies ?? {});

      const missing = EXPECTED_CLI_DEPS.filter((d) => !packedDeps.includes(d));
      if (missing.length > 0) depErrors.push(`Missing expected CLI deps in tarball: ${missing.join(", ")}`);

      // Exact-name forbidden check
      const forbidden = packedDeps.filter((d) => FORBIDDEN_DEPS.includes(d));
      if (forbidden.length > 0) depErrors.push(`Forbidden web deps in tarball: ${forbidden.join(", ")}`);

      // Prefix-based forbidden check (catches entire scoped families)
      const forbiddenByPrefix = packedDeps.filter((d) =>
        FORBIDDEN_PREFIXES.some((prefix) => d.startsWith(prefix))
      );
      if (forbiddenByPrefix.length > 0) {
        depErrors.push(`Forbidden scoped deps in tarball (prefix match): ${forbiddenByPrefix.join(", ")}`);
      }

      const extra = packedDeps.filter((d) => !EXPECTED_CLI_DEPS.includes(d) && !FORBIDDEN_DEPS.includes(d));
      if (extra.length > 0) depErrors.push(`Unexpected extra deps in tarball: ${extra.join(", ")}`);

      if (packedDeps.length !== EXPECTED_CLI_DEPS.length) {
        depErrors.push(`Dep count mismatch in tarball. Expected ${EXPECTED_CLI_DEPS.length}, got ${packedDeps.length}: ${packedDeps.join(", ")}`);
      }

      if (depErrors.length === 0) {
        console.log(`  ✓ Tarball deps verified: ${packedDeps.join(", ")}`);
      }
    }

    // ── Step 5: Install test ─────────────────────────────────────────────────
    // Install the packed tarball into a temp dir and verify the dep tree is
    // small (CLI-only). A full web manifest installs 665+ packages; CLI-only
    // installs ~15-35. Threshold is set well below web dep bloat territory.
    console.log("Running install test...");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtrim-install-test-"));
    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ name: "runtrim-install-test", version: "1.0.0", private: true })
      );
      const tgzArg = tarballPath.replace(/\\/g, "/");
      const prefixArg = tmpDir.replace(/\\/g, "/");
      run(
        `npm install --prefix "${prefixArg}" --omit=dev --no-save --no-package-lock "${tgzArg}"`,
        { timeout: 120000 }
      );
      const nodeModulesDir = path.join(tmpDir, "node_modules");
      const installedCount = countInstalledPackages(nodeModulesDir);
      if (installedCount > MAX_INSTALLED_PACKAGES) {
        depErrors.push(
          `Install test FAILED: ${installedCount} packages installed (max ${MAX_INSTALLED_PACKAGES}). ` +
          `Web dep leak detected. Confirm only CLI deps are in package.json before publishing.`
        );
      } else {
        console.log(`  ✓ Install test: ${installedCount} packages installed`);
      }
    } catch (installErr) {
      depErrors.push(`Install test could not complete: ${String(installErr.message).slice(0, 300)}`);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  } else {
    // npm_config_dry_run=true was inherited — tarball not written to disk.
    // Fall back: verify the on-disk CLI-only package.json directly.
    console.log("  (dry-run mode — verifying on-disk manifest instead of tarball)");
    const onDiskDeps = Object.keys(cliPkg.dependencies ?? {});

    const missing = EXPECTED_CLI_DEPS.filter((d) => !onDiskDeps.includes(d));
    if (missing.length > 0) depErrors.push(`Missing expected CLI deps: ${missing.join(", ")}`);

    const forbidden = onDiskDeps.filter((d) => FORBIDDEN_DEPS.includes(d));
    if (forbidden.length > 0) depErrors.push(`Forbidden web deps in manifest: ${forbidden.join(", ")}`);

    const forbiddenByPrefix = onDiskDeps.filter((d) =>
      FORBIDDEN_PREFIXES.some((prefix) => d.startsWith(prefix))
    );
    if (forbiddenByPrefix.length > 0) {
      depErrors.push(`Forbidden scoped deps in manifest (prefix match): ${forbiddenByPrefix.join(", ")}`);
    }

    const extra = onDiskDeps.filter((d) => !EXPECTED_CLI_DEPS.includes(d) && !FORBIDDEN_DEPS.includes(d));
    if (extra.length > 0) depErrors.push(`Unexpected extra deps: ${extra.join(", ")}`);

    if (onDiskDeps.length !== EXPECTED_CLI_DEPS.length) {
      depErrors.push(`Dep count mismatch. Expected ${EXPECTED_CLI_DEPS.length}, got ${onDiskDeps.length}: ${onDiskDeps.join(", ")}`);
    }

    if (depErrors.length === 0) {
      console.log(`  ✓ On-disk manifest deps verified: ${onDiskDeps.join(", ")}`);
    }
  }
} finally {
  // Always restore repository package.json and remove any leftover tarball.
  run("node scripts/restore-package-manifest.mjs");
  if (fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }
}

if (depErrors.length > 0) {
  console.error("\nPackage verification FAILED:");
  for (const e of depErrors) console.error(`  ✖ ${e}`);
  process.exit(1);
}

if (files.length > 0) {
  console.log(`  ✓ Files: ${files.length} files (${REQUIRED_FILES.length} required present)`);
}
console.log(`  ✓ No forbidden web dependencies`);
console.log("Package verification passed.");
