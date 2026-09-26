import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
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
            "@starfall/shared": path.resolve(workspaceRoot, "packages/shared/src"),
        },
    },
});
