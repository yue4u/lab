import { html, css, c } from "../core";

c({
  tag: "lab-nav-item",
  template: html`
    <h2><slot /></h2>
  `,
  style: css`
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
  `
});

const template = html`
  <lab-nav-item>
    Tools
  </lab-nav-item>

  <lab-nav-item>
    Projects
  </lab-nav-item>
`;

const style = css`
  lab-nav-item {
    transition: 0.3s all ease-in-out;
  }
  lab-nav-item:hover {
    text-decoration: underline;
  }
`;

export default c({
  tag: "lab-nav",
  style,
  template
});
