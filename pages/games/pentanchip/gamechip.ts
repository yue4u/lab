import common from "./common";
import Renderable from "./renderable";
import { GameChipInterface, GameChipPosition, PlayerIndex } from "./type";

export default class GameChip extends Renderable implements GameChipInterface {

    public id: string;
    public position: GameChipPosition;
    public ownedBy: PlayerIndex;
    public selected: boolean;
    public hover: boolean;

    constructor(position: GameChipPosition, ownedBy: PlayerIndex) {
        super();
        this.position = position;
        this.ownedBy = ownedBy;
        this.id = common.PositionToSting(position);
        this.hover = false;
        this.selected = false;
    }

    public render() {
        this._ctx.beginPath();
        this._ctx.arc(
            this.position.x * this._config.LATTICE.SIZE,
            this.position.y * this._config.LATTICE.SIZE,
            this._config.GAME_CHIP.RADIUS,
            0, 2 * Math.PI, false,
        );
        this._ctx.shadowBlur = 5;

        this._ctx.shadowColor = this.hover
            ? this._config.COLOR.SHADOW
            : "rgba(0,0,0,0)";

        this._ctx.fillStyle = this._config.COLOR[this.ownedBy];
        this._ctx.fill();
        this._ctx.closePath();
        this._ctx.lineWidth = 4;

        this._ctx.strokeStyle = this.selected
            ? "crimson"
            : "black";
        this._ctx.stroke();
    }
}
