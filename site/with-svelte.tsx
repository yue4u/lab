import type { Component } from "@/site/core";

export const withSvelte = (SvelteApp: any): Component => ({
  script: {
    onMount(target) {
      new SvelteApp({ target });
    },
  },
});
