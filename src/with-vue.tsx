import type { Component } from "@/src/core";
import { createApp } from "vue";

export const withVue = (
  element: Parameters<typeof createApp>[0]
): Component => ({
  script: {
    onMount(root) {
      createApp(element).mount(root as any);
    },
  },
});
