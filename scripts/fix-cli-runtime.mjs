#!/usr/bin/env node

import fs from "fs";
import path from "path";

const distDir = path.resolve(process.cwd(), "dist-cli");
const distPkgPath = path.join(distDir, "package.json");
const cjsLauncherPath = path.join(distDir, "runtrim.cjs");

if (!fs.existsSync(distDir)) {
  process.exit(0);
}

fs.writeFileSync(
  distPkgPath,
  `${JSON.stringify({ type: "module" }, null, 2)}\n`,
  "utf-8"
);

const launcher = `#!/usr/bin/env node
import("./runtrim.js").catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

fs.writeFileSync(cjsLauncherPath, launcher, "utf-8");
