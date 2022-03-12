import { describe, expect, test } from "vitest";
import { BoardV2 as Board } from "./board-v2";
import puzzle3x3_00 from "./8puzzle/puzzle3x3-00.txt?raw";
import puzzle3x3_01 from "./8puzzle/puzzle3x3-01.txt?raw";
import puzzle3x3_02 from "./8puzzle/puzzle3x3-02.txt?raw";
import puzzle15 from "./8puzzle/puzzle15.txt?raw";
import puzzle50 from "./8puzzle/puzzle50.txt?raw";

describe("board", () => {
  test("parses", () => {
    expect(Board.from(puzzle3x3_00).toString()).toMatchInlineSnapshot(
      `
      "1,2,3
      4,5,6
      7,8,0"
    `
    );
    expect(Board.from(puzzle3x3_01).toString()).toMatchInlineSnapshot(
      `
      "1,2,3
      4,5,0
      7,8,6"
    `
    );
    expect(Board.from(puzzle15).toString()).toMatchInlineSnapshot(`
      "1,2,3,4,5,6,7,8
      9,10,11,12,13,14,15,16
      17,18,19,20,21,22,23,24
      0,25,27,28,29,30,31,32
      34,26,35,36,37,38,39,40
      33,41,42,43,45,46,47,48
      49,50,51,44,61,53,54,56
      57,58,59,52,60,62,55,63"
    `);

    expect(Board.from(puzzle50).toString()).toMatchInlineSnapshot(
      `
      "2,9,3,5
      8,11,12,7
      15,4,0,13
      6,1,10,14"
    `
    );
  });

  test("hamming", () => {
    expect(
      Board.from(`3
        8 1 3
        4 0 2
        7 6 5
    `).hamming
    ).toBe(5);
    expect(Board.from(puzzle3x3_00).hamming).toBe(0);
    expect(Board.from(puzzle3x3_01).hamming).toBe(1);
    expect(Board.from(puzzle3x3_02).hamming).toBe(2);
  });

  test("manhattan", () => {
    expect(
      Board.from(`3
        8 1 3
        4 0 2
        7 6 5
    `).manhattan
    ).toBe(10);
  });

  test("isGoal", () => {
    expect(Board.from(puzzle3x3_00).isGoal).toBe(true);
    expect(Board.from(puzzle3x3_01).isGoal).toBe(false);
  });

  test("blank", () => {
    const b = Board.from(puzzle3x3_01);
    expect(b.blank).toMatchInlineSnapshot(`
      [
        1,
        2,
      ]
    `);
  });

  test("neighbors", () => {
    expect(
      Array.from(
        Board.from(
          `3
      1 0 3
      4 2 5
      7 8 6
    `
        ).neighbors()
      ).map((b) => b?.toString())
    ).toMatchInlineSnapshot(`
      [
        "1,2,3
      4,0,5
      7,8,6",
        "1,3,0
      4,2,5
      7,8,6",
        "0,1,3
      4,2,5
      7,8,6",
      ]
    `);
  });

  test("twin", () => {
    expect(
      Board.from(
        `3
    1 0 3
    4 2 5
    7 8 6
  `
      )
        .twin()
        .toString()
    ).toMatchInlineSnapshot(`
      "3,0,1
      4,2,5
      7,8,6"
    `);

    expect(
      Board.from(
        `3
        8 1 3
        4 0 2
        7 6 5
    `
      )
        .twin()
        .toString()
    ).toMatchInlineSnapshot(`
      "1,8,3
      4,0,2
      7,6,5"
    `);
  });
});
