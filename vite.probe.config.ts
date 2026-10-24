import { defineConfig } from "vite";

// The probe is a separate, framework-free bundle. It lands in public/ so the
// app's dev server and build both serve it at /probe.js.
const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const app = process.env.CADENCE_APP ?? (production ? `https://${production}` : "http://localhost:5173");

export default defineConfig({
  publicDir: false,
  define: { __CADENCE_APP__: JSON.stringify(app) },
  build: {
    outDir: "public",
    emptyOutDir: false,
    target: "es2020",
    minify: true,
    lib: {
      entry: "src/probe/auto.ts",
      formats: ["iife"],
      name: "CadenceProbe",
      fileName: () => "probe.js",
    },
  },
});
