import React, { ReactElement } from "react";
import ReactDOM from "react-dom";

export const withReact = (element: ReactElement) => ({
  render(root: HTMLElement) {
    ReactDOM.render(<React.StrictMode>{element}</React.StrictMode>, root);
  },
});
