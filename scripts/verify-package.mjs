import { execSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
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
const parsed = JSON.parse(packRaw);
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

console.log("Package verification passed.");
