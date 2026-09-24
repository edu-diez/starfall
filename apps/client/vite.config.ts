import { defineConfig } from "vite";
import path from "path";

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
      "/colyseus": {
        target: "http://localhost:2567",
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@starfall/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});