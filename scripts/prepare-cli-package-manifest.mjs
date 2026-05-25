import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");
const backupDir = path.join(rootDir, ".runtrim", "tmp");
const backupPath = path.join(backupDir, "package.publish-backup.json");

const CLI_RUNTIME_DEPENDENCIES = [
  "chalk",
  "clipboardy",
  "commander",
  "execa",
  "nanoid",
  "ora",
  "prompts",
  "zod",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const pkg = readJson(packageJsonPath);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(packageJsonPath, backupPath);
}

const nextDependencies = {};
for (const depName of CLI_RUNTIME_DEPENDENCIES) {
  const version = pkg.dependencies?.[depName];
  if (typeof version === "string" && version.length > 0) {
    nextDependencies[depName] = version;
  }
}

const missing = CLI_RUNTIME_DEPENDENCIES.filter((dep) => !nextDependencies[dep]);
if (missing.length > 0) {
  throw new Error(
    `Cannot prepare CLI publish manifest. Missing dependency versions in package.json: ${missing.join(", ")}`
  );
}

const publishPkg = {
  ...pkg,
  dependencies: nextDependencies,
};

writeJson(packageJsonPath, publishPkg);
console.log(`Prepared CLI-only publish manifest with ${Object.keys(nextDependencies).length} runtime dependencies.`);
