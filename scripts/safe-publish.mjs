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

const extraArgs = process.argv.slice(2);

function run(cmd, opts = {}) {
  execSync(cmd, { encoding: "utf8", stdio: "inherit", ...opts });
}

// ── Step 1: Build and verify ──────────────────────────────────────────────────
console.log("Building CLI...");
run("npm run -s build:cli");
run("npm run -s verify:cli");

// ── Step 2: Full package verification (builds tarball, inspects it) ───────────
console.log("Verifying package...");
run("npm run -s verify:package");

// ── Step 3: Prepare CLI-only manifest ────────────────────────────────────────
// verify:package already ran prepare+restore, so package.json is now full.
// We strip it again here for the actual publish.
console.log("Preparing CLI-only publish manifest...");
run("node scripts/prepare-cli-package-manifest.mjs");

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
