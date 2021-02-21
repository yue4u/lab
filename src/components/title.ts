import { css, html } from "@/src/core";

export const template = () => html`<slot />`;

export const style = css`
  lab-title {
    display: block;
    font-family: "Dancing Script", cursive;
    font-size: 4rem;
    margin-top: 0;
    padding: 10px 1rem;
    border-bottom: 2px solid #333;
  }
  lab-title::before {
    content: ".";
    color: skyblue;
  }
  lab-title::after {
    content: ".";
    color: hotpink;
  }
`;
