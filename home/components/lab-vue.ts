import { css, html, c, LitElement } from "../../packages/core";

import Vue from "vue";
import App from "./vue-counter";

const tag = "lab-vue";

const template = html`
  <div id="vue"></div>
`;

const script = {
  mounted(el: LitElement) {
    if (el.shadowRoot === null) {
      return;
    }
    const root = el.shadowRoot.querySelector("div");

    if (root) {
      new Vue(App).$mount(root);
    }
  }
};

const style = css`
  div {
    width: 100%;
  }
`;

export default c({
  tag,
  template,
  style,
  script
});
