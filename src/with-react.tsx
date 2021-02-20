import React, { ReactElement } from "react";
import ReactDOM from "react-dom";
import { define } from "./with-define";

export const withReact = (element: ReactElement) =>
  define((root) => {
    ReactDOM.render(<React.StrictMode>{element}</React.StrictMode>, root);
  });
