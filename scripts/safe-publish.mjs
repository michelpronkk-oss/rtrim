/**
 * safe-publish.mjs
 *
 * Explicit-lifecycle alternative to bare `npm publish`.
 * Owns the prepare/restore cycle in a try/finally so repository
 * package.json is always restored — even if publish fails or is
 * cancelled mid-flight.
 *
 * Usage:
 *   npm run publish:safe                   (defaults to --access public)
 *   npm run publish:safe -- --dry-run      (dry run, no actual upload)
 *   npm run publish:safe -- --tag next     (publish to a dist-tag)
 *
 * This script calls `npm publish --ignore-scripts` so the prepack/postpack
 * hooks do NOT run a second time — we manage the lifecycle ourselves.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const extraArgs = process.argv.slice(2);

function run(cmd, opts = {}) {
  execSync(cmd, { encoding: "utf8", stdio: "inherit", ...opts });
}

// ── CLI-only dependency constants (mirrors verify-package.mjs) ────────────────
const EXPECTED_CLI_DEPS = ["chalk", "clipboardy", "commander", "execa", "nanoid", "ora", "prompts", "zod"];
const FORBIDDEN_PUBLISH_DEPS = [
  "next", "react", "react-dom", "next-themes",
  "framer-motion", "motion",
  "remotion", "@remotion/cli", "@remotion/player",
  "@supabase/ssr", "@supabase/supabase-js",
  "resend", "dodopayments",
  "shadcn", "lucide-react", "sonner",
  "radix-ui", "tailwind-merge", "tw-animate-css",
];
const FORBIDDEN_PUBLISH_PREFIXES = ["@radix-ui/", "@remotion/", "@supabase/", "@vercel/"];

function checkManifestIsCliOnly(label) {
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const deps = Object.keys(manifest.dependencies ?? {});

  const forbiddenExact = FORBIDDEN_PUBLISH_DEPS.filter((d) => deps.includes(d));
  const forbiddenPrefix = deps.filter((d) =>
    FORBIDDEN_PUBLISH_PREFIXES.some((prefix) => d.startsWith(prefix))
  );
  const missing = EXPECTED_CLI_DEPS.filter((d) => !deps.includes(d));
  const extra = deps.filter(
    (d) => !EXPECTED_CLI_DEPS.includes(d) && !FORBIDDEN_PUBLISH_DEPS.includes(d)
  );

  const errors = [];
  if (forbiddenExact.length > 0) errors.push(`Forbidden deps found: ${forbiddenExact.join(", ")}`);
  if (forbiddenPrefix.length > 0) errors.push(`Forbidden scoped deps (prefix): ${forbiddenPrefix.join(", ")}`);
  if (missing.length > 0) errors.push(`Missing expected CLI deps: ${missing.join(", ")}`);
  if (extra.length > 0) errors.push(`Unexpected extra deps: ${extra.join(", ")}`);
  if (deps.length !== EXPECTED_CLI_DEPS.length) {
    errors.push(`Dep count wrong: expected ${EXPECTED_CLI_DEPS.length}, got ${deps.length}`);
  }

  if (errors.length > 0) {
    console.error(`\n${label} FAILED:`);
    for (const e of errors) console.error(`  ✖ ${e}`);
    return false;
  }
  console.log(`  ✓ ${label}: CLI-only dependencies confirmed (${deps.join(", ")})`);
  return true;
}

// ── Step 1: Build and verify ──────────────────────────────────────────────────
console.log("Building CLI...");
run("npm run -s build:cli");
run("npm run -s verify:cli");

// ── Step 2: Full package verification (builds tarball, inspects it, install test)
// verify:package internally prepares the CLI manifest, packs, verifies, then restores.
// After this step, package.json is the full repository manifest again.
console.log("Verifying package...");
run("npm run -s verify:package");

// ── Step 3: Prepare CLI-only manifest ────────────────────────────────────────
// verify:package already ran prepare+restore, so package.json is now full.
// We strip it again here for the actual publish.
console.log("Preparing CLI-only publish manifest...");
run("node scripts/prepare-cli-package-manifest.mjs");

// ── Step 3.5: Pre-publish manifest guard ─────────────────────────────────────
// Hard-verify that package.json is now CLI-only BEFORE calling npm publish.
// This catches any failure in prepare-cli-package-manifest.mjs and prevents
// publishing with the full web manifest (which is the root cause of the
// 0.1.32 dependency bloat incident).
const manifestOk = checkManifestIsCliOnly("Pre-publish manifest check");
if (!manifestOk) {
  // Restore immediately so the repo is not left in a stripped state.
  try { execSync("node scripts/restore-package-manifest.mjs", { stdio: "inherit" }); } catch { /* ignore */ }
  process.exit(1);
}

// ── Step 4: Publish with --ignore-scripts ────────────────────────────────────
// --ignore-scripts prevents prepack/postpack from running again (we own this).
// --access public is the default for scoped packages; harmless for unscoped.
const publishArgs = ["--ignore-scripts", "--access", "public", ...extraArgs].join(" ");
try {
  console.log(`Publishing: npm publish ${publishArgs}`);
  run(`npm publish ${publishArgs}`);
  console.log("Published successfully.");
} finally {
  // Restore ALWAYS — even if publish was rejected, timed out, or Ctrl+C'd.
  console.log("Restoring repository package.json...");
  run("node scripts/restore-package-manifest.mjs");
}
