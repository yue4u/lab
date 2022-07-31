import { define, Component } from "./core";
import "./assets/index.css";
import "css-doodle";

const components: Record<string, Component> = import.meta.glob(
  "./components/*.ts",
  { eager: true }
);

Object.entries(components).forEach(async ([path, exports]) => {
  const name = `lab-` + path.split("/").reverse()[0].split(".")[0];
  define(exports)(name);
});

const view = document.createElement("lab-app");
document.querySelector("#app")?.replaceWith(view);
