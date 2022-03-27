import { css, html, Script } from "@/site/core";
import { marked } from "marked";

export const template = () => html`<slot />`;

export const style = css`
  @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap");
  lab-md {
    font-family: "JetBrains Mono", monospace;
    word-break: break-word;
  }
  lab-md li {
    line-height: 2;
  }
  lab-md img {
    width: 100%;
  }
  lab-md a {
    display: inline;
    text-decoration: underline;
    opacity: 0.5;
    transition: 0.3s all ease-in-out;
  }
  lab-md a:hover {
    opacity: 1;
  }
  lab-md code {
    background-color: rgba(100, 100, 100, 0.5);
    border-radius: 3px;
    padding: 2px 5px;
  }
`;

export const script: Script = {
  onMount(root) {
    root.innerHTML = marked.parse(root.innerHTML);
  },
};
