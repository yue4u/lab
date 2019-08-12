import { html, css, c } from "../core";
import "../components";

const tag = "lab-root";

const style = css`
  main {
    text-align: center;
  }
`;

const template = html`
  <main>
    <lab-title>Tiny Lab 😀 </lab-title>
    <lab-react></lab-react>
    <lab-vue></lab-vue>
  </main>
`;

export default c({
  tag,
  style,
  template
});
