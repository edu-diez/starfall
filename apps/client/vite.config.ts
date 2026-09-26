import { defineConfig } from "vite";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:2567",
      },
      "/colyseus": {
        target: "http://localhost:2567",
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@starfall/shared": resolve(workspaceRoot, "packages/shared/src"),
    },
  },
});
