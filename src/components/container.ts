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
    lab-grid {
      display: grid;
    }
  `,
})("lab-grid");

define({
  template: () => html`<slot />`,
  style: css`
    lab-section-title {
      text-transform: capitalize;
      display: block;
      font-size: 3rem;
      margin: 2rem 0;
    }
  `,
})("lab-section-title");

export const template = () => html``;

export const style = css`
  lab-container {
    display: block;
    margin: 0 2rem;
  }
`;
