import { css, html } from "@/src/core";

export const template = () => html`<slot />`;

export const style = css`
  :host {
    display: block;
    font-size: 4rem;
    margin-top: 0;
    padding: 10px 1rem;
    border-bottom: 2px solid #333;
  }
  :host::before {
    content: ".";
    color: skyblue;
  }
  :host::after {
    content: ".";
    color: hotpink;
  }
`;
