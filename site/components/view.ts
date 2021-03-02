import { Script, define } from "@/site/core";
import { router, routes } from "@/site/router";

export const script: Script = {
  onMount(el) {
    const onChange = async (l: Location) => {
      const match = routes.get(l.pathname);
      if (!match) {
        if (el.children.length) {
          el.children[0].remove();
        }
        return;
      }
      const { component, tag } = match;
      define(await component())(tag);
      const view = document.createElement(tag);
      if (el.children.length) {
        el.children[0].replaceWith(view);
      } else {
        el.appendChild(view);
      }
    };

    onChange(window.location);
    router.listen(onChange);
  },
};
