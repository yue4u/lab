import { html, css, Script } from "@/site/core";
import { router } from "@/site/router";

export const template = ({ to }: { to: string }) =>
  html`<a href="${to}"><slot /></a>`;

export const style = css`
  lab-link {
    font-size: 1.4rem;
    color: currentColor;
    font-weight: normal;
    text-decoration: none;
    display: block;
  }
  lab-link:hover {
    opacity: 0.8;
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
