import path from "path";
import { defineConfig } from "vitest/config";
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
      localsConvention: "camelCase",
    },
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
    target: "esnext",
    emptyOutDir: true,
    outDir: path.resolve(__dirname, "./dist"),
    rollupOptions: { external: ["express"] },
  },
  worker: {
    format: "es",
  },
  test: {
    globals: true,
    include: ["../projects/**/*.{test,spec}.ts"],
  },
});
