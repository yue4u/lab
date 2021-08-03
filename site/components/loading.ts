import { html, Script } from "@/site/core";

export const template = () => html`loading`;

export const script: Script = {
  onMount(el) {
    setInterval(() => {
      el.textContent += ".";
    }, 100);
  },
};
