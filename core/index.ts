import { CSSResult, TemplateResult, LitElement, html, css } from "lit-element";
export { html, css, LitElement };

type ElementScript = {
  mounted(el: LitElement): void;
};

export type ElementBase = {
  tag: string;
  style?: CSSResult;
  template: TemplateResult;
  script?: ElementScript;
};

export function c(el: ElementBase) {
  customElements.define(
    el.tag,
    class extends LitElement {
      constructor() {
        super();
        console.log(`build ${el.tag}`);
      }
      firstUpdated() {
        if (el.script) {
          el.script.mounted(this);
        }
      }
      static get styles() {
        return el.style ? el.style : css``;
      }
      render() {
        return el.template;
      }
    }
  );
}
