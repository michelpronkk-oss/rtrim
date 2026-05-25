import { execSync } from "node:child_process";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    throw new Error(`${context} missing: ${needle}`);
  }
}

const sourceAgentHelp = run("npm run -s runtrim -- agent --help");
const distAgentHelp = run("node dist-cli/runtrim.cjs agent --help");
const distRootHelp = run("node dist-cli/runtrim.cjs --help");

const requiredFlags = [
  "--preview",
  "--apply",
  "--execute",
  "--run",
  "--dry-run",
  "--confirm",
];

for (const flag of requiredFlags) {
  assertIncludes(sourceAgentHelp, flag, "source agent help");
  assertIncludes(distAgentHelp, flag, "dist agent help");
}

const coreCommands = ["go", "finish", "status", "agent", "bridge", "execute"];
for (const command of coreCommands) {
  assertIncludes(distRootHelp, command, "dist root help");
}

console.log("CLI parity verified (source vs dist).");
