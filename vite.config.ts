import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, "site"),
  define: {
    "import.meta.vitest": false,
  },
  plugins: [
    vue(),
    react(),
    {
      name: "configure-server",

      configureServer(server) {
        server.middlewares.use((_, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
    svelte({
      preprocess: sveltePreprocess(),
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: path.resolve(__dirname, "./dist"),
  },
  test: {
    globals: true,
    includeSource: ["projects/**/*.ts"],
  },
});
