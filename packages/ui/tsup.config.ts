import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
  publicDir: false,
  onSuccess: async () => {
    const { copyFile } = await import("node:fs/promises");
    await copyFile("src/styles.css", "dist/styles.css");
  },
});
