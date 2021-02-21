export type Render = (el: HTMLElement) => void;

export const define = ({
  style,
  template,
  render,
}: {
  style?: string;
  template?: string;
  render?: (el: HTMLElement) => void;
}) => (name: string) => {
  console.log(name);
  if (customElements.get(name)) {
    return;
  }
  customElements.define(
    name,
    class extends HTMLElement {
      constructor() {
        super();
      }
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });
        if (style) {
          const styleEl = document.createElement("style");
          styleEl.innerHTML = style;
          shadowRoot.appendChild(styleEl);
        }
        if (template) {
          const templateEl = document.createElement("template");
          templateEl.innerHTML = template;
          shadowRoot.appendChild(templateEl.content);
        }
        if (render) {
          render(shadowRoot as any);
        }
      }
    }
  );
};

export function raw(strings: TemplateStringsArray) {
  return strings.raw[0];
}

export const html = raw;
export const css = raw;
