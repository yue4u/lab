import React, { ReactElement } from "react";
import ReactDOM from "react-dom";
import type { Component } from "@/site/core";

export const withReact = (element: ReactElement): Component => ({
  script: {
    onMount(root) {
      ReactDOM.render(<React.StrictMode>{element}</React.StrictMode>, root);
    },
  },
});
