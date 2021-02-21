import { html, css } from "@/src/core";

export const template = html`<h2><slot /></h2> `;

export const style = css`
  h2 {
    transition: 0.3s all ease-in-out;
    color: #fff;
    font-weight: normal;
    font-family: "Atomic Age", cursive;
    text-shadow: 2px 2px 0 #ccc1ff;
    padding: 0;
    margin: 0;
    filter: drop-shadow(0 0 2px #000);
  }
  h2:hover {
    text-decoration: underline;
  }
`;
