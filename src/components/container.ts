import { html, css, define } from "@/src/core";

define({
  template: ({ title }: { title: string }) => html`
    <lab-section-title>${title}</lab-section-title>
    <slot />
  `,
})("lab-section");

define({
  template: () => html`<slot />`,
  style: css`
    :host {
      display: grid;
    }
  `,
})("lab-grid");

define({
  template: () => html`<slot />`,
  style: css`
    :host {
      text-transform: capitalize;
      display: block;
      font-size: 3rem;
      margin: 2rem 0;
    }
  `,
})("lab-section-title");

export const template = () => html` <slot /> `;

export const style = css`
  :host {
    display: block;
    margin: 0 2rem;
  }
`;
