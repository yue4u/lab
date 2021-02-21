import type { Component } from "@/src/core";
import { createApp } from "vue";

export const withVue = (
  element: Parameters<typeof createApp>[0]
): Component => ({
  script: {
    onMount(root) {
      const el = document.createElement("div");
      root.appendChild(el);
      createApp(element).mount(el);
    },
  },
});
