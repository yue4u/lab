import { describe, expect, test } from "vitest";
import puzzle3x3_00 from "./8puzzle/puzzle3x3-00.txt?raw";
import puzzle04 from "./8puzzle/puzzle04.txt?raw";
import puzzle20 from "./8puzzle/puzzle20.txt?raw";
import { Solver } from "./solver";

describe("solver", () => {
  test("solves", () => {
    const solver = Solver.fromPuzzle(puzzle3x3_00);
    expect(solver.stepsToString()).toMatchInlineSnapshot(
      `
      "1,2,3
      4,5,6
      7,8,0"
    `
    );
    expect(solver.moves).toBe(0);
  });

  test("steps", () => {
    const solver04 = Solver.fromPuzzle(puzzle04);
    expect(solver04.moves).toBe(4);
    expect(solver04.stepsToString()).toMatchInlineSnapshot(
      `
      "0,1,3
      4,2,5
      7,8,6
      ---
      1,0,3
      4,2,5
      7,8,6
      ---
      1,2,3
      4,0,5
      7,8,6
      ---
      1,2,3
      4,5,0
      7,8,6
      ---
      1,2,3
      4,5,6
      7,8,0"
    `
    );

    const solver20 = Solver.fromPuzzle(puzzle20);
    expect(solver20.moves).toBe(20);
    expect(solver20.stepsToString()).toMatchInlineSnapshot(
      `
      "1,6,4
      7,0,8
      2,3,5
      ---
      1,6,4
      7,3,8
      2,0,5
      ---
      1,6,4
      7,3,8
      2,5,0
      ---
      1,6,4
      7,3,0
      2,5,8
      ---
      1,6,0
      7,3,4
      2,5,8
      ---
      1,0,6
      7,3,4
      2,5,8
      ---
      1,3,6
      7,0,4
      2,5,8
      ---
      1,3,6
      7,4,0
      2,5,8
      ---
      1,3,6
      7,4,8
      2,5,0
      ---
      1,3,6
      7,4,8
      2,0,5
      ---
      1,3,6
      7,4,8
      0,2,5
      ---
      1,3,6
      0,4,8
      7,2,5
      ---
      1,3,6
      4,0,8
      7,2,5
      ---
      1,3,6
      4,2,8
      7,0,5
      ---
      1,3,6
      4,2,8
      7,5,0
      ---
      1,3,6
      4,2,0
      7,5,8
      ---
      1,3,0
      4,2,6
      7,5,8
      ---
      1,0,3
      4,2,6
      7,5,8
      ---
      1,2,3
      4,0,6
      7,5,8
      ---
      1,2,3
      4,5,6
      7,0,8
      ---
      1,2,3
      4,5,6
      7,8,0"
    `
    );
  });

  const tests = import.meta.glob("./8puzzle/puzzle*.txt", {
    assert: { type: "raw" },
  });

  Object.entries(tests).forEach(([file, puzzle]) => {
    const unsolvable = file.includes("unsolvable");
    const moves = unsolvable
      ? -1
      : Number(file.match(/.+?0*?(?<moves>\d+).txt/)?.groups?.moves);

    if (moves > 30 || process.env.SLOW_TEST) {
      console.log(`skip ${file}`);
      return;
    }
    test.concurrent(file, () => {
      const solver = Solver.fromPuzzle(puzzle as any as string);

      if (file.includes("unsolvable")) {
        expect(solver.solvable).toBe(false);
        expect(solver.moves).toBe(-1);
        return;
      }

      const moves = Number(
        file.match(/.+?0*?(?<moves>\d+).txt/)?.groups?.moves
      );

      if (moves <= 30 || process.env.SLOW_TEST) {
        expect(solver.solvable).toBe(true);
        expect(solver.moves).toBe(moves);
        return;
      }

      throw new Error(`file ${file} not tested`);
    });
  });
});
