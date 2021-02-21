export type Script = {
  onMount?(root: ShadowRoot): void;
};

export type Component = {
  style?: string;
  template?: (props: any) => string;
  script?: Script;
};

export const define = ({ style, template, script }: Component) => (
  name: string
) => {
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
          const attributes = Object.values(this.attributes).reduce(
            (acc, curr) => {
              const { name, value } = curr;
              return {
                ...acc,
                [name]: value,
              };
            },
            {}
          );
          templateEl.innerHTML = template(attributes);
          shadowRoot.appendChild(templateEl.content);
        }
        if (script?.onMount) {
          script.onMount(shadowRoot);
        }
      }
    }
  );
};

export function raw(templateString: TemplateStringsArray, ...rest: any[]) {
  return (
    templateString[0] +
    rest
      .map((arg, i) => {
        const next = templateString[1 + i];
        const content = Array.isArray(arg) ? arg.join("") : arg;
        return content + (next ? next : "");
      })
      .join("")
  );
}

export const html = raw;
export const css = raw;
