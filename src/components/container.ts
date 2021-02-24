import { html, css, define } from "@/src/core";

define({
  template: ({ title }: { title: string }) => html`
    <lab-section-title>${title}</lab-section-title>
    <slot />
  `,
  style: css``,
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
      font-size: 2.4rem;
      transition: 0.2s all ease-in-out;
      color: #eee;
      font-family: "Atomic Age", cursive;
      text-shadow: 2px 2px 0 #607d8b88;
    }
    lab-section-title:hover {
      text-shadow: 5px 2px 0 #607d8b88;
    }
  `,
})("lab-section-title");

export const template = () => html``;

export const style = css`
  lab-container {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2rem;
    margin: 0 2rem;
  }
  lab-view {
    margin-top: 2rem;
    display: block;
  }
  @media screen and (max-width: 680px) {
    lab-container {
      display: block;
      margin: 0 2rem;
    }
  }
`;
