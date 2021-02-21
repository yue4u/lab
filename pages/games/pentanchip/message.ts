import Renderable from "./renderable";

export default class Message extends Renderable {

    public msg: string;

    constructor() {
        super();
        this.msg = "";
    }

    public render() {

        const x = 50;
        const y = 250;
        const width = 500;
        const height = 100;
        const radius = 10;

        this._ctx.beginPath();
        this._ctx.beginPath();
        this._ctx.moveTo(x + radius, y);
        this._ctx.lineTo(x + width - radius, y);
        this._ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this._ctx.lineTo(x + width, y + height - radius);
        this._ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this._ctx.lineTo(x + radius, y + height);
        this._ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this._ctx.lineTo(x, y + radius);
        this._ctx.quadraticCurveTo(x, y, x + radius, y);
        this._ctx.closePath();

        this._ctx.fillStyle = "white";
        this._ctx.fill();
        this._ctx.stroke();

        if (this.msg) {
            this._ctx.fillStyle = "black";
            // console.log(this.msg);
            this._ctx.font = "50px Courier New";
            this._ctx.textAlign = "center";
            this._ctx.fillText(this.msg, this._canvas.width / 2, this._canvas.height / 2 + 20);
        }

    }
}
