import { createElement, render, mount, diff } from "../packages/vLab";

const App = (count: number) =>
  createElement("div", {
    attrs: {
      id: "app",
      dataCount: count
    },
    children: [
      createElement("p", {
        children: ["The current count is: ", String(count)]
      }),
      createElement("p", {
        children: [
          ...[...Array(count < 0 ? 0 : count).keys()].map(i =>
            createElement("span", {
              attrs: {
                class: `count`
              },
              children: [String(i + 1)]
            })
          )
        ]
      })
    ]
  });

let count = 21;
let vApp = App(count);
const app = render(vApp);
let rootEl = mount(app, document.getElementById("root") as HTMLElement);

setInterval(() => {
  count = Math.floor(Math.random() * 50);
  const vNewApp = App(count);
  const patch = diff(vApp, vNewApp);

  rootEl = patch(rootEl);

  vApp = vNewApp;
}, 500);
