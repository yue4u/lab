import React from "react";
import { Router } from "react-router-dom";
import history from "./history";
import App from "./app";

import { withReact } from "@/site/with-react";

export const { script } = withReact(
  <Router history={history}>
    <App />
  </Router>
);
