import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  path.join(root, "dist-cli", "runtrim.cjs"),
  path.join(root, "dist-cli", "runtrim.js"),
];

const missing = required.filter((p) => !fs.existsSync(p));
if (missing.length > 0) {
  console.error("CLI build verification failed. Missing artifacts:");
  for (const p of missing) console.error(`- ${path.relative(root, p)}`);
  process.exit(1);
}

console.log("CLI build artifacts verified.");
