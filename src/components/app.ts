import { html } from "@/src/core";

export const template = () => html`
  <lab-link to="/">
    <lab-title>Lab.</lab-title>
  </lab-link>
  <lab-container>
    <lab-nav></lab-nav>
    <lab-view></lab-view>
  </lab-container>
`;
