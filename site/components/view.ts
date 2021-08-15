import { Script, define } from "@/site/core";
import { router, routes } from "@/site/router";

export const script: Script = {
  onMount(el) {
    const view = (tag: string) => {
      const route = document.createElement(tag);
      if (el.children.length) {
        el.children[0].replaceWith(route);
      } else {
        el.appendChild(route);
      }
      return route;
    };

    const onChange = async (l: Location) => {
      const tag = async () => {
        const match = routes.get(l.pathname);
        if (!match) return "lab-404";

        const { component, tag } = match;
        if (customElements.get(tag)) return tag;

        view("lab-loading");
        define(await component())(tag);
        return tag;
      };
      await tag().then(view);
    };

    onChange(window.location);
    router.listen(onChange);
  },
};
