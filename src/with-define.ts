export const define = (render: (el: HTMLElement) => void) => (name: string) => {
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
        console.log(`render ${name}`);
        render(this);
      }
    }
  );
};
