import { Script, define } from "@/site/core";
import { router, routes } from "@/site/router";

export const script: Script = {
  onMount(el) {
    const onChange = async (l: Location) => {
      const placeholder = document.createElement("lab-loading");

      if (el.children.length) {
        el.children[0].replaceWith(placeholder);
      } else {
        el.appendChild(placeholder);
      }
      const [_, type, name] = l.pathname.split("/");
      const match = routes.get(["", type, name].join("/"));
      if (!match) {
        placeholder.replaceWith(document.createElement("lab-404"));
        return;
      }
      const { component, tag } = match;
      define(await component())(tag);
      const view = document.createElement(tag);
      placeholder.replaceWith(view);
    };

    onChange(window.location);
    router.listen(onChange);
  },
};
