import { render, type ComponentChild } from "preact";
import type { Component } from "@/site/core";

export const withPreact = (element: ComponentChild): Component => ({
  script: {
    onMount(root) {
      render(element, root);
    },
  },
});
