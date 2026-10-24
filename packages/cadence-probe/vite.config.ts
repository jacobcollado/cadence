import { defineConfig } from "vite";
import { resolve } from "node:path";

// Builds the npm package: ESM and CommonJS for both entries, with the probe
// split into its own chunk. React stays the host app's.
const app = process.env.CADENCE_APP ?? "https://cadence-seven-ivory.vercel.app";

export default defineConfig({
  publicDir: false,
  define: { __CADENCE_APP__: JSON.stringify(app) },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "es2020",
    minify: true,
    lib: {
      entry: { index: resolve(__dirname, "src/index.ts"), react: resolve(__dirname, "src/react.tsx") },
      formats: ["es", "cjs"],
      fileName: (format, name) => `${name}.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
      // The React entry runs in the browser only; Next.js needs to be told.
      output: { banner: (chunk) => (chunk.name === "react" ? '"use client";' : "") },
    },
  },
});
