import { css, html } from "@/src/core";

export const template = () => html`<h1><slot /></h1>`;

export const style = css`
  h1 {
    color: red;
  }
`;
