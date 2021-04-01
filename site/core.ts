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
        // const shadowRoot = this.attachShadow({ mode: "open" });
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

          let content = template(attributes);
          if (content.includes(`<slot />`)) {
            content = content.replace(`<slot />`, this.innerHTML);
            this.innerHTML = "";
          }
          templateEl.innerHTML = content;
          this.appendChild(templateEl.content);
        }
        if (style) {
          const styleEl = document.createElement("style");
          styleEl.innerHTML = style;
          this.appendChild(styleEl);
        }
        if (script?.onMount) {
          script.onMount(this as any);
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
        return content + next ?? "";
      })
      .join("")
  );
}

export const html = raw;
export const css = raw;
