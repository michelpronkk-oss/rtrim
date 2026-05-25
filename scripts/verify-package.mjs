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

try {
  run("npm run -s build");
} catch (error) {
  const stderr = String(error?.stderr ?? "");
  if (!stderr.includes("Another next build process is already running")) throw error;
  // Fallback for transient Next lock: still verify fresh CLI build + parity.
  run("npm run -s build:cli");
}
run("npm run -s verify:cli");

const packRaw = run("npm pack --dry-run --json");
const parsed = parsePackJson(packRaw);
const pack = Array.isArray(parsed) ? parsed[0] : parsed;
const files = Array.isArray(pack?.files) ? pack.files.map((f) => f.path) : [];

const required = ["dist-cli/runtrim.cjs", "dist-cli/runtrim.js", "package.json", "README.md"];
for (const file of required) {
  if (!files.includes(file)) throw new Error(`Package missing required file: ${file}`);
}

const forbiddenPatterns = [
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

for (const file of files) {
  for (const pattern of forbiddenPatterns) {
    if (file.includes(pattern)) throw new Error(`Package contains forbidden artifact: ${file}`);
  }
}

const packedRaw = run("npm pack --json");
const packedParsed = parsePackJson(packedRaw);
const packed = Array.isArray(packedParsed) ? packedParsed[0] : packedParsed;
const archiveName = packed?.filename;
if (!archiveName) throw new Error("Could not locate npm pack archive filename.");

const packedPackageJsonRaw = run(`tar -xOf ${archiveName} package/package.json`);
const packedPackageJson = JSON.parse(packedPackageJsonRaw);
const packedDeps = Object.keys(packedPackageJson.dependencies ?? {});

const expectedCliDeps = [
  "chalk",
  "clipboardy",
  "commander",
  "execa",
  "nanoid",
  "ora",
  "prompts",
  "zod",
];

if (packedDeps.length !== expectedCliDeps.length) {
  throw new Error(
    `Published dependency surface mismatch. Expected ${expectedCliDeps.length} CLI deps, found ${packedDeps.length}: ${packedDeps.join(", ")}`
  );
}

for (const dep of expectedCliDeps) {
  if (!packedDeps.includes(dep)) {
    throw new Error(`Published package is missing expected CLI dependency: ${dep}`);
  }
}

const forbiddenDeps = [
  "next",
  "react",
  "react-dom",
  "framer-motion",
  "motion",
  "@radix-ui/react-accordion",
  "@radix-ui/react-dialog",
  "@supabase/supabase-js",
];

for (const dep of forbiddenDeps) {
  if (packedDeps.includes(dep)) {
    throw new Error(`Published package unexpectedly includes web dependency: ${dep}`);
  }
}

if (fs.existsSync(archiveName)) {
  fs.unlinkSync(archiveName);
}

console.log("Package verification passed.");
