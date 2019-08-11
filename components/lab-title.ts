import { LitElement, html, customElement } from "lit-element";

@customElement("lab-title")
export class LabTitle extends LitElement {
  render() {
    return html`
      <h1>Tiny Lab</h1>
    `;
  }
}
