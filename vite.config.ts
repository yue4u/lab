import path from "path";
import { defineConfig, createFilter } from "vite";
import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import react from "@vitejs/plugin-react";
import preact from "@preact/preset-vite";

const preactProjects = /img-diff.+?\.tsx?/;

// https://vitejs.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, "site"),
  define: {
    "import.meta.vitest": false,
  },
  css: {
    modules: {
      localsConvention: "camelCase"
    }
  },
  plugins: [
    vue(),
    preact({
      include: preactProjects,
    }),
    react({
      exclude: preactProjects,
    }),
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
