import config from "./config";
import * as type from "./type";
import { canvas, ctx } from ".";
export default abstract class Renderable {
  public _canvas: HTMLCanvasElement = canvas;
  public _ctx: CanvasRenderingContext2D = ctx;
  public _config: type.GameConfig = config;

  public abstract render(): void;
}
