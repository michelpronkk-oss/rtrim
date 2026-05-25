import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");
const backupPath = path.join(rootDir, ".runtrim", "tmp", "package.publish-backup.json");

if (!fs.existsSync(backupPath)) {
  console.log("No publish manifest backup found. Skipping restore.");
  process.exit(0);
}

fs.copyFileSync(backupPath, packageJsonPath);
fs.unlinkSync(backupPath);
console.log("Restored repository package.json after pack/publish.");
