import common from "./common";
import config from "./config";
import GameChip from "./gamechip";
import DefaultBoard from "./map";
import Message from "./message";
import Renderable from "./renderable";
import * as type from "./type";

let playerResolve = (a: any) => {};

export default class Pentachip extends Renderable {
  public gameover: boolean;
  public turn: type.PlayerIndex;
  private pcTurn: type.PlayerIndex;
  private config: type.GameConfig;
  private board: type.BoardInterface;
  private selected: type.GameChipInterface | null;
  private chips: type.GameChipInterface[];
  private hints: type.GameChipInterface[];
  private message: Message;

  constructor(el: HTMLCanvasElement) {
    super();
    this._canvas.height = 600;
    this._canvas.width = 600;
    this.config = config;
    this.board = new DefaultBoard();
    const state = this.board.load();
    this.chips = state.chips;
    this.hints = [];
    this.selected = null;
    this.message = new Message();
    this.gameover = false;
    this.turn = "P1";
    this.pcTurn = "P2";

    this._canvas.onmousemove = (e) => {
      const hoverPosition = this.getEventPositon(e);
      let hoveringSome = false;
      this.chips.map((chip) => {
        const hover = this.isInside(chip.position, hoverPosition);
        chip.hover = hover;
        if (hover) {
          hoveringSome = true;
        }
      });
      const _game = el;

      if (hoveringSome) {
        this.render();
        _game.style.cursor = "pointer";
      } else {
        _game.style.cursor = "default";
      }
    };

    this._canvas.onclick = (e) => {
      if (this.gameover) {
        this.reset();
      }

      if (this.selected && !Boolean(this.hints.length)) {
        return;
      }

      const clickPositon = this.getEventPositon(e);
      let selectedSome = false;

      for (const chip of this.chips) {
        const selected = this.isInside(chip.position, clickPositon);
        if (selected) {
          if (chip.ownedBy !== this.turn) {
            return;
          }
          selectedSome = true;
          this.selected = chip;
          this.hints = [];
          this.searchHintPoints(chip.position).map((hint) =>
            this.hints.push(new GameChip(hint, "GAME"))
          );
        }
        chip.selected = selected;
      }

      this.hints.map((hint) => {
        const clicked = this.isInside(hint.position, clickPositon);
        if (clicked) {
          this.hints = [];
          this.to(hint.position);
        }
        return;
      });
      if (selectedSome) {
        this.render();
      }
    };
  }

  public start(startBy: type.PlayerIndex) {
    this.turn = startBy;
    const first = startBy === "P1" ? "YOU" : "PC";
    this.message.msg = `${first} go first`;
    console.log("__START__");
    this.render();
    setTimeout(() => {
      this.message.msg = "";
      this.render();
    }, 1000);
  }

  public render() {
    this._ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.board.render();
    this.renderChips();
    this.renderHints();
    if (this.message.msg) {
      this.message.render();
    }
  }

  public occupy(...chips: type.GameChipPosition[]) {
    const opponentChips = this.getChips(this.nextTurn());

    opponentChips.map((opponentChip) => {
      for (const chip of chips) {
        if (
          opponentChip.position.x === chip.x &&
          opponentChip.position.y === chip.y
        ) {
          opponentChip.ownedBy = this.turn;
        }
      }
    });
  }

  public getEventPositon(e: MouseEvent): type.GameChipPosition {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  public renderChips() {
    this.chips.map((chip) => chip.render());
  }

  public renderHints() {
    this.hints.map((hint) => hint.render());
  }

  public move(chipOrId: type.GameChipInterface | string) {
    let movingChip: type.GameChipInterface;

    if (typeof chipOrId === "string") {
      const chipList = this.chips.filter((chip) => chip.id === chipOrId);

      if (chipList.length === 1) {
        movingChip = chipList[0];
      } else {
        return;
      }
    } else {
      movingChip = chipOrId;
    }

    this.selected = movingChip;
    return this;
  }

  public to(newPosition: type.GameChipPosition): Promise<null> {
    return new Promise((resolve, rejects) => {
      // console.log(newPosition);

      if (!this.selected) {
        rejects(new Error("Not selected"));
        return;
      }

      const distence: type.GameChipPosition = {
        x: newPosition.x - this.selected.position.x,
        y: newPosition.y - this.selected.position.y,
      };

      const loop = () => {
        let done = true;

        if (!this.selected) {
          return;
        }

        if (this.selected.position.x !== newPosition.x) {
          done = false;
          this.selected.position.x += distence.x / 50;
          this.selected.position.x = parseFloat(
            this.selected.position.x.toFixed(2)
          );
        }

        if (this.selected.position.y !== newPosition.y) {
          done = false;
          this.selected.position.y += distence.y / 50;

          this.selected.position.y = parseFloat(
            this.selected.position.y.toFixed(2)
          );
        }

        if (!done) {
          this.render();
          requestAnimationFrame(loop);
        } else {
          this.selected = null;
          this.check();
          this.render();
          this.turn = this.nextTurn();
          resolve(null);
          playerResolve(null);
        }
      };
      loop();
      // if (this.turn === this.ai){
      //    this.autoPlay()
      // }
    });
  }

  public choose<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  }

  public async run() {
    while (!this.gameover) {
      this.turn === "P2" ? await this.pc() : await this.player();
    }
  }

  public async pc() {
    //   console.log("my turn");
    const playerChips = this.getChips(this.turn);

    const possible: type.GameChipHintInfo[] = [];

    playerChips.map((chip) => {
      possible.push({
        chip,
        hints: this.searchHintPoints(chip.position),
      });
    });

    const selected = this.choose(possible);
    this.selected = selected.chip;

    const position = this.choose(selected.hints);

    await this.to(position);
  }
  public async player() {
    return new Promise((resolve) => (playerResolve = resolve));
  }

  private reset() {
    // TODO: inpage reload
    location.reload();
  }

  private nextTurn(): type.PlayerIndex {
    return this.turn === "P1" ? "P2" : "P1";
  }

  private getChips(ownedBy: type.PlayerIndex): type.GameChipInterface[] {
    return this.chips.filter((chip) => chip.ownedBy === ownedBy);
  }

  private check() {
    this.checkPoked();
    this.checkClutch();
    this.checkWin();
  }

  private checkWin() {
    const p1Chips = this.getChips("P1");
    const p2Chips = this.getChips("P2");

    if (p1Chips.length === 0 || !this.hasPotential(p1Chips)) {
      this.message.msg = "YOU LOSE";
      this.gameover = true;
    }

    if (p2Chips.length === 0 || !this.hasPotential(p2Chips)) {
      this.message.msg = "YOU WIN";
      this.gameover = true;
    }
    // console.log(this.message.msg);
  }

  private hasPotential(chips: type.GameChipInterface[]): boolean {
    let potentialList: type.GameChipPosition[] = [];
    chips.map((chip) => {
      potentialList = potentialList.concat(
        this.searchHintPoints(chip.position)
      );
    });
    return Boolean(potentialList.length);
  }

  private checkPoked() {
    const opponentChips = this.getChips(this.nextTurn()).map(
      (chip) => chip.position
    );

    if (opponentChips.length === 2) {
      return;
    }

    const selfChips = this.getChips(this.turn);

    selfChips.map((chip) => {
      const isPoked = this.checkSingleAround(
        chip.position,
        opponentChips,
        "poke"
      );
      if (isPoked) {
        chip.ownedBy = this.turn;
        this.check();
        this.render();
      }
    });
  }

  private checkClutch() {
    const opponentChips = this.getChips(this.nextTurn());
    const selfChips = this.getChips(this.turn).map((chip) => chip.position);

    if (opponentChips.length === 1) {
      return;
    }

    opponentChips.map((chip) => {
      const isClutched = this.checkSingleAround(chip.position, selfChips);
      if (isClutched) {
        chip.ownedBy = this.turn;
        this.check();
        this.render();
      }
    });
  }

  private checkSingleAround(
    position: type.GameChipPosition,
    chipsAround: type.GameChipPosition[],
    action: "clutch" | "poke" = "clutch"
  ): boolean {
    let testPoint: type.GameChipPosition;
    let diagonalPoint: type.GameChipPosition;

    testPoint = {
      x: position.x - 1,
      y: position.y - 1,
    };

    diagonalPoint = {
      x: position.x + 1,
      y: position.y + 1,
    };
    // console.log({testPoint,diagonalPoint})

    if (
      this.isInMap(testPoint, diagonalPoint) &&
      this.isOccupied(chipsAround, testPoint, diagonalPoint)
    ) {
      if (action === "poke") {
        this.occupy(testPoint, diagonalPoint);
      }
      return true;
    }

    testPoint = {
      x: position.x,
      y: position.y - 1,
    };

    diagonalPoint = {
      x: position.x,
      y: position.y + 1,
    };
    // console.log({testPoint,diagonalPoint})

    if (
      this.isInMap(testPoint, diagonalPoint) &&
      this.isOccupied(chipsAround, testPoint, diagonalPoint)
    ) {
      if (action === "poke") {
        this.occupy(testPoint, diagonalPoint);
      }
      return true;
    }

    testPoint = {
      x: position.x + 1,
      y: position.y - 1,
    };

    diagonalPoint = {
      x: position.x - 1,
      y: position.y + 1,
    };
    // console.log({testPoint,diagonalPoint})

    if (
      this.isInMap(testPoint, diagonalPoint) &&
      this.isOccupied(chipsAround, testPoint, diagonalPoint)
    ) {
      if (action === "poke") {
        this.occupy(testPoint, diagonalPoint);
      }
      return true;
    }

    testPoint = {
      x: position.x + 1,
      y: position.y,
    };

    diagonalPoint = {
      x: position.x - 1,
      y: position.y,
    };
    // console.log({testPoint,diagonalPoint})

    if (
      this.isInMap(testPoint, diagonalPoint) &&
      this.isOccupied(chipsAround, testPoint, diagonalPoint)
    ) {
      if (action === "poke") {
        this.occupy(testPoint, diagonalPoint);
      }
      return true;
    }

    return false;
  }

  private isInMap(...positions: type.GameChipPosition[]) {
    return positions.every((position) => {
      return (
        position.x >= 1 && position.x <= 5 && position.y >= 1 && position.y <= 5
      );
    });
  }

  private isInside(
    point1: type.GameChipPosition,
    point2: type.GameChipPosition
  ) {
    const distence = Math.sqrt(
      Math.abs(point1.x * this.config.LATTICE.SIZE - point2.x) ** 2 +
        Math.abs(point1.y * this.config.LATTICE.SIZE - point2.y) ** 2
    );
    const hover = distence < this.config.GAME_CHIP.RADIUS;
    return hover;
  }

  private isOccupied(
    positionList: type.GameChipPosition[],
    ...testPoints: type.GameChipPosition[]
  ): boolean {
    return testPoints.every((testPoint) => {
      const occupied = positionList.filter((point) => {
        return point.x === testPoint.x && point.y === testPoint.y;
      });
      return Boolean(occupied.length);
    });
  }

  private searchHintPoints(
    selected: type.GameChipPosition
  ): type.GameChipPosition[] {
    const positionString = common.PositionToSting(selected);
    const directions = this.board.directionMap[positionString];
    let hintPointList: type.GameChipPosition[] = [];
    directions.forEach((direction) => {
      // onsole.log(direction)
      hintPointList = hintPointList.concat(
        this.searchDirectionHintPoints(selected, this.board.vectors[direction])
      );
    });

    return hintPointList;
  }

  private searchDirectionHintPoints(
    selected: type.GameChipPosition,
    vec: type.GameChipPosition
  ): type.GameChipPosition[] {
    const hintPointList: type.GameChipPosition[] = [];

    let testPoint = {
      x: selected.x + vec.x,
      y: selected.y + vec.y,
    };

    // console.log({selected})
    // console.log({testPoint})

    const occupiedList = this.chips.map((chip) => chip.position);

    while (
      this.isInMap(testPoint) &&
      !this.isOccupied(occupiedList, testPoint)
    ) {
      hintPointList.push(testPoint);

      testPoint = {
        x: testPoint.x + vec.x,
        y: testPoint.y + vec.y,
      };
    }
    return hintPointList;
  }
}
