#!/usr/bin/env node

let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdin += chunk;
});
process.stdin.on("end", () => {
  const argPrompt = process.argv.slice(2).join(" ").trim();
  const prompt = argPrompt || stdin.trim();
  const preview = prompt.slice(0, 120).replace(/\s+/g, " ");
  console.log(`fixture_received=${prompt.length}`);
  console.log(`fixture_preview=${preview}`);
  console.log("root cause: fixture execution");
  console.log("changed files: none");
  console.log("verify: no-op");
  console.log("next step: done");
});
if (process.stdin.isTTY) {
  process.stdin.emit("end");
}
