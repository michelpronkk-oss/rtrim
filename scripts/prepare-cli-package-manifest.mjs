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

// Guard: refuse to strip an already-stripped manifest. If "next" is absent from
// dependencies the repo package.json is already CLI-only (a previous run may have
// failed to restore). Stripping it again would back up the broken state and make
// restore silently return a CLI-only manifest too.
if (!pkg.dependencies?.["next"]) {
  throw new Error(
    'prepare-cli-package-manifest: "next" not found in dependencies. ' +
    "The repository package.json appears to already be in CLI-only publish state. " +
    "Restore it from git (git checkout -- package.json) or from the full manifest before running publish again."
  );
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

fs.copyFileSync(packageJsonPath, backupPath);

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
