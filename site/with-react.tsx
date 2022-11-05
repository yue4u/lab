// @ts-expect-error
import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Component } from "@/site/core";

export const withReact = (element: ReactNode): Component => ({
  script: {
    onMount(root) {
      createRoot(root).render(<React.StrictMode>{element}</React.StrictMode>);
    },
  },
});
