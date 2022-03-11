type BoardLocation = [number, number];
type BoardDataV1 = number[][];

export class BoardV1 {
  dimension: number;
  data: BoardDataV1;
  source?: string;
  blank: BoardLocation;
  cache: {
    hamming?: number;
    manhattan?: number;
    string?: string;
  } = {};

  constructor({
    dimension,
    source,
    blank,
    data,
  }: Pick<BoardV1, "dimension" | "source" | "blank" | "data">) {
    this.dimension = dimension;
    this.source = source;
    this.data = data;
    this.blank = blank;
  }

  static from(text: string) {
    const [n, ...lines] = text.split("\n");
    const dimension = Number(n);
    let blank: BoardLocation | undefined = undefined;
    const data = lines
      .map((l, i) => {
        if (i >= dimension) return null;
        const nums = l
          .trim()
          .split(/\s+/g)
          .map((cell, j) => {
            const num = Number(cell);
            if (num === 0) {
              blank = [i, j];
            }
            return num;
          });
        return nums;
      })
      .filter((l): l is number[] => Boolean(l));
    if (!blank) throw Error("no blank found");
    return new BoardV1({ source: text, dimension, blank, data });
  }

  static get ops() {
    return [
      [-1, 0],
      [1, 0],
      [0, 1],
      [0, -1],
    ];
  }

  get id() {
    this.cache.string ??= this.data.map((row) => row.join(",")).join("\n");
    return this.cache.string;
  }

  get isGoal() {
    return this.hamming === 0;
  }

  get manhattan() {
    this.cache.manhattan ??= this.data.reduce((rs, row, i) => {
      return (
        rs +
        row.reduce((cs, cell, j) => {
          if (cell === 0) return cs;
          const idx = cell - 1;
          const [x, y] = [
            Math.floor(idx / this.dimension),
            idx % this.dimension,
          ];
          return cs + Math.abs(i - x) + Math.abs(j - y);
        }, 0)
      );
    }, 0);
    return this.cache.manhattan;
  }

  inBoard([x, y]: BoardLocation) {
    return 0 <= x && x < this.dimension && 0 <= y && y < this.dimension;
  }

  *neighbors(): IterableIterator<BoardV1> {
    for (const [x, y] of BoardV1.ops) {
      const [blankI, blankJ] = this.blank;
      const [movedX, movedY] = [blankI + x, blankJ + y];
      if (!this.inBoard([movedX, movedY])) continue;
      // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1237
      // @ts-expect-error
      const moved = structuredClone(this.data);
      moved[blankI][blankJ] = moved[movedX][movedY];
      moved[movedX][movedY] = 0;
      yield new BoardV1({
        data: moved,
        dimension: this.dimension,
        blank: [movedX, movedY],
      });
    }
  }

  get hamming() {
    this.cache.hamming ??= this.data.reduce((rs, row, i) => {
      return (
        rs +
        row.reduce((cs, cell, j) => {
          const expected = i * this.dimension + j + 1;
          if (expected == this.dimension ** 2) return cs;
          return cs + (cell === expected ? 0 : 1);
        }, 0)
      );
    }, 0);
    return this.cache.hamming;
  }
}
