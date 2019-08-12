import { html, c, LitElement } from "../core";
import React from "react";
import ReactDOM from "react-dom";
import ReactCounter from "./react-counter";

const tag = "lab-react";

const template = html``;

const script = {
  mounted(el: LitElement) {
    if (el.shadowRoot === null) {
      return;
    }
    ReactDOM.render(<ReactCounter />, el.shadowRoot);
  }
};

export default c({
  tag,
  template,
  script
});
