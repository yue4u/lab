import { suite, add, cycle, complete } from "benny";
import { BoardV1 } from "./board-v1";
import { BoardV2 } from "./board-v2";

const tests = Object.values(
  import.meta.glob("./8puzzle/puzzle*.txt", {
    assert: { type: "raw" },
  })
) as any as string[];

suite(
  "parse",

  add("BoardV1", () => {
    tests.map(BoardV1.from);
  }),

  add("BoardV2", () => {
    tests.map(BoardV2.from);
  }),

  cycle(),
  complete()
);

const boardsV1 = tests.map(BoardV1.from);
const boardsV2 = tests.map(BoardV2.from);

suite(
  "manhattan",

  add("BoardV1 manhattan", () => {
    boardsV1.map((b) => b.manhattan);
  }),

  add("BoardV2 manhattan", () => {
    boardsV2.map((b) => b.manhattan);
  }),

  cycle(),
  complete()
);

suite(
  "hamming",

  add("BoardV1 hamming", () => {
    boardsV1.map((b) => b.hamming);
  }),

  add("BoardV2 hamming", () => {
    boardsV2.map((b) => b.hamming);
  }),

  cycle(),
  complete()
);

suite(
  "neighbors",

  add("BoardV1 neighbors", () => {
    boardsV1.map((b) => Array.from(b.neighbors()));
  }),

  add("BoardV2 neighbors", () => {
    boardsV2.map((b) => Array.from(b.neighbors()));
  }),

  cycle(),
  complete()
);
