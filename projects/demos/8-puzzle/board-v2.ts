type BoardLocation = [number, number];
type BoardDataV2 = number[];

export class BoardV2 {
  dimension: number;
  data: BoardDataV2;
  source?: string;
  blank: BoardLocation;
  cache: {
    hamming?: number;
    manhattan?: number;
    string?: string;
  } = {};

  static idxMap: Map<string, [number, number]> = new Map();
  static calcIdx(dimension: number, i: number) {
    const key = `${dimension}-${i}`;
    const cache = BoardV2.idxMap.get(key);
    if (cache) return cache;
    const result: [number, number] = [Math.floor(i / dimension), i % dimension];
    BoardV2.idxMap.set(key, result);
    return result;
  }

  constructor({
    dimension,
    source,
    blank,
    data,
  }: Pick<BoardV2, "dimension" | "source" | "blank" | "data">) {
    this.dimension = dimension;
    this.source = source;
    this.data = data;
    this.blank = blank;
  }

  static from(text: string) {
    const [n, ...lines] = text.split("\n");
    const dimension = Number(n);
    let blank: BoardLocation | undefined = undefined;
    const data: number[] = [];
    lines.forEach((l, i) => {
      if (i >= dimension) return null;
      l.trim()
        .split(/\s+/g)
        .map((cell, j) => {
          const num = Number(cell);
          if (num === 0) {
            blank = [i, j];
          }
          if (Number.isInteger(num)) {
            data.push(num);
          }
        });
    });

    if (!blank) throw Error("no blank found");
    return new BoardV2({ source: text, dimension, blank, data });
  }

  static get ops() {
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
  }

  get id() {
    this.cache.string ??= this.data.join(",");
    return this.cache.string;
  }

  toString() {
    const arr = this.data;
    const n = this.dimension;
    // https://stackoverflow.com/a/55435856
    function* chunks() {
      for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n);
      }
    }
    return [...chunks()].join("\n");
  }

  get isGoal() {
    return this.hamming === 0;
  }

  get manhattan() {
    this.cache.manhattan ??= this.data.reduce((acc, cell, i) => {
      if (cell === 0) return acc;
      const idx = cell - 1;
      const [p, q] = BoardV2.calcIdx(this.dimension, i);
      const [x, y] = BoardV2.calcIdx(this.dimension, idx);
      return acc + Math.abs(p - x) + Math.abs(q - y);
    }, 0);
    return this.cache.manhattan;
  }

  inBoard(x: number, y: number) {
    return 0 <= x && x < this.dimension && 0 <= y && y < this.dimension;
  }

  *neighbors(): IterableIterator<BoardV2> {
    for (const [x, y] of BoardV2.ops) {
      const [blankI, blankJ] = this.blank;
      const [movedX, movedY] = [blankI + x, blankJ + y];
      if (!this.inBoard(movedX, movedY)) continue;
      const moved: number[] = [...this.data];
      const movedIdx = this.dimension * movedX + movedY;
      const blankIdx = this.dimension * blankI + blankJ;
      moved[blankIdx] = moved[movedIdx];
      moved[movedIdx] = 0;
      yield new BoardV2({
        data: moved,
        dimension: this.dimension,
        blank: [movedX, movedY],
      });
    }
  }

  get hamming() {
    this.cache.hamming ??= this.data.reduce((acc, cell, i) => {
      const expected = i + 1;
      if (expected == this.dimension ** 2) return acc;
      return acc + (cell === expected ? 0 : 1);
    }, 0);
    return this.cache.hamming;
  }

  twin(): BoardV2 {
    const [blankI, blankJ] = this.blank;
    const blankIdx = this.dimension * blankI + blankJ;
    const twinData = [...this.data];
    let i = -1;
    let swapIdx: number | null = null;
    while (true) {
      i++;
      if (i === blankIdx) continue;
      if (swapIdx !== null) {
        const tmp = twinData[swapIdx];
        twinData[swapIdx] = twinData[i];
        twinData[i] = tmp;
        break;
      } else {
        swapIdx = i;
      }
    }
    return new BoardV2({
      dimension: this.dimension,
      data: twinData,
      blank: this.blank,
    });
  }
}
