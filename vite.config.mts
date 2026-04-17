import { defineConfig } from "vite";
import { builtinModules } from "module";

export default defineConfig({
  build: {
    lib: {
      entry: "src/extension.ts",
      formats: ["cjs"],
      fileName: () => "extension.js",
    },
    rollupOptions: {
      external: [
        "vscode",
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
    outDir: "dist",
    sourcemap: false,
    target: "node20",
    emptyOutDir: true,
  },
});
