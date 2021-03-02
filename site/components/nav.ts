import { html, css } from "@/site/core";
import { links } from "@/site/router";

export const template = () => {
  return html`
    ${Object.entries(links).map(
      ([type, pages]) =>
        html`<lab-section title=${type}>
          ${Object.values(pages).map(
            (page) => html`<lab-link to="${page.slug}">${page.name}</lab-link>`
          )}
        </lab-section>`
    )}
  `;
};

export const style = css`
  lab-nav {
    display: block;
    margin-bottom: 2rem;
    /* position: sticky; */
    /* top: 0; */
  }
`;
