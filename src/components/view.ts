import { Render, define } from "@/src/core";

const modules: Record<string, Function> = import.meta.glob(
  "../../pages/**/index.ts*"
);

export const render: Render = (el) => {
  Object.entries(modules).forEach(async ([path, component]) => {
    const [type, name] = path.replace("../../pages/", "").split("/");
    const slug = ["", type, name].join("/");
    if (window.location.pathname === slug) {
      const tag = `lab-` + name;
      define(await component())(tag);
      const view = document.createElement(tag);
      el.appendChild(view);
    }
  });
};
