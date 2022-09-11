import Pentachip from "./pentachip";
import { PlayerIndex } from "./type";
import { css, Script } from "@/site/core";

export const style = css`
  canvas {
    display: inline-block;
    width: 600px;
    height: 600px;
    box-shadow: 0 0 1rem #000;
  }
`;

export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;

export const script: Script = {
  onMount(el) {
    const h = <T extends keyof HTMLElementTagNameMap>(
      tagName: T,
      options?: Partial<HTMLElementTagNameMap[T]>,
    ) => Object.assign(document.createElement(tagName), options);

    const title = h("h1", {
      innerText: "Pentachip",
    });
    const link = h("a", {
      innerText: "wikipedia(Chinese)",
      rel: "noopener noreferrer",
      href: "https://zh.wikipedia.org/zh/%E6%8C%91%E5%A4%BE%E6%A3%8B",
    });
    link.style.marginBottom = "1rem";

    canvas = h("canvas");
    ctx = canvas.getContext("2d")!;
    el.append(title, link, canvas);

    const game = new Pentachip(canvas);
    const players: PlayerIndex[] = ["P1", "P2"];
    game.start(game.choose(players));
    game.run();
  },
};
