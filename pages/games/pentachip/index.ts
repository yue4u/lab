import Pentachip from "./pentachip";
import { PlayerIndex } from "./type";
import { css, Script } from "@/src/core";

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
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d")!;
    el.appendChild(canvas);
    const game = new Pentachip(canvas);
    const players: PlayerIndex[] = ["P1", "P2"];
    game.start(game.choose(players));
    game.run();
  },
};
