import { html, c } from "../../packages/core";

c({
  tag: "lab-wrapper",
  template: html`
    <div><slot /></div>
  `
});
