import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_BACKEND_TARGET || "http://localhost:8090";

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@/app": path.resolve(__dirname, "./src/app"),
        "@/views": path.resolve(__dirname, "./src/views"),
        "@/widgets": path.resolve(__dirname, "./src/widgets"),
        "@/entities": path.resolve(__dirname, "./src/entities"),
        "@/shared": path.resolve(__dirname, "./src/shared"),
      },
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-tiptap": ["@tiptap/react", "@tiptap/core", "@tiptap/starter-kit"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-router": ["react-router"],
          },
        },
      },
    },

    server: {
      port: 5173,
      allowedHosts: [
        "776eb3ee-e549-450d-a851-d8b07ffd1f4a.castle-x.top",
        "ed364da1-a43c-480d-b00f-49a98a73d8b4.castle-x.top",
      ],
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/_": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
