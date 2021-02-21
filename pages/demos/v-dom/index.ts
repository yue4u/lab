import { css, Render } from "@/src/core";
import { createElement } from "./createElement";
import { render as renderV, mount } from "./render";
import { diff } from "./diff";

export const style = css`
  span {
    font-size: 2rem;
    background-color: aquamarine;
    border: 1px solid hotpink;
    height: 3rem;
    width: 3rem;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }
`;

const App = (count: number) =>
  createElement("div", {
    children: [
      createElement("p", {
        children: ["The current count is: ", String(count)],
      }),
      createElement("p", {
        children: [
          ...[...Array(count < 0 ? 0 : count).keys()].map((i) =>
            createElement("span", {
              children: [String(i + 1)],
            })
          ),
        ],
      }),
    ],
  });

export const render: Render = (root) => {
  let el = document.createElement("div");
  root.appendChild(el);
  let count = 21;
  let vApp = App(count);
  const app = renderV(vApp);
  let rootEl = mount(app, el);
  setInterval(() => {
    count = Math.floor(Math.random() * 50);
    const vNewApp = App(count);
    const patch = diff(vApp, vNewApp);
    rootEl = patch(rootEl);
    vApp = vNewApp;
  }, 1000);
};
