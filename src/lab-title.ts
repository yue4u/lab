import { css, html, c } from "../../../packages/core";

const tag = "lab-title";

const template = html`
  <h1><slot /></h1>
`;

const style = css`
  h1 {
    color: #fff;
  }
`;

export default c({
  tag,
  template,
  style
});
