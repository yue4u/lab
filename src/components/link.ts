import { html, css, Script } from "@/src/core";
import { router } from "@/src/router";

export const template = ({ to }: { to: string }) =>
  html`<a href="${to}"><slot /></a>`;

export const style = css`
  a {
    transition: 0.3s all ease-in-out;
    color: currentColor;
    font-weight: normal;
    font-family: "Atomic Age", cursive;
  }
  a:visited {
    color: currentColor;
  }
  a:hover {
    color: currentColor;
  }
`;

export const script: Script = {
  onMount(root) {
    let tag = root.querySelector("a")!;
    tag.onclick = (e) => {
      e.preventDefault();
      router.push(tag.href);
    };
  },
};
