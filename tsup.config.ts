import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["cli/runtrim.ts"],
  format: ["esm", "cjs"],
  outDir: "dist-cli",
  clean: true,
  splitting: false,
  sourcemap: false,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs",
    };
  },
});
