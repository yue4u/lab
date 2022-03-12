import { BoardV2 as Board } from "./board-v2";
import {
  MinPriorityQueue,
  PriorityQueueItem,
} from "@datastructures-js/priority-queue";

class SearchNode {
  prev: SearchNode | null;
  current: Board;
  moves: number;
  priority: number;
  constructor({
    prev,
    current,
    moves,
  }: Pick<SearchNode, "moves" | "prev" | "current">) {
    this.moves = moves;
    this.prev = prev;
    this.current = current;
    this.priority = current.manhattan + this.moves;
  }

  steps() {
    return Array.from(this.solution());
  }

  stepsToString() {
    return this.steps()
      .map((b) => b?.toString())
      .join("\n---\n");
  }

  *solution(): IterableIterator<Board | null> {
    let node: SearchNode = this;
    const steps: Board[] = [];
    while (true) {
      steps.unshift(node.current);
      if (!node.prev) break;
      node = node.prev;
    }
    for (const board of steps) {
      yield board;
    }
  }
}

export class AStar {
  _pq: MinPriorityQueue<SearchNode>;
  _seen = new Set<string>();

  constructor(board: Board) {
    this._pq = new MinPriorityQueue<SearchNode>({
      priority: (node) => node.priority,
    });
    this._pq.enqueue(
      new SearchNode({
        prev: null,
        current: board,
        moves: 0,
      })
    );
    this._seen.add(board.id);
  }

  step(): SearchNode | null {
    if (this._pq.isEmpty()) return null;

    const { element: node } =
      this._pq.dequeue() as PriorityQueueItem<SearchNode>;

    if (node.current.isGoal) {
      return node;
    }

    for (const neighbor of node.current.neighbors()) {
      const id = neighbor.id;
      if (this._seen.has(id)) continue;
      this._seen.add(id);
      this._pq.enqueue(
        new SearchNode({
          prev: node,
          current: neighbor,
          moves: node.moves + 1,
        })
      );
    }

    return null;
  }
}

interface SolverOptions {
  maxSearchIteration?: number;
}

export class Solver {
  _main: AStar;
  _twin: AStar;
  solved?: SearchNode | null;
  maxSearchIteration?: number;

  constructor(board: Board, options?: SolverOptions) {
    this._main = new AStar(board);
    this._twin = new AStar(board.twin());
    this.maxSearchIteration = options?.maxSearchIteration;
    this.solve();
  }

  static fromPuzzle(source: string, options?: SolverOptions) {
    return new Solver(Board.from(source), options);
  }

  get solvable() {
    return Boolean(this.solved);
  }

  get moves() {
    return this.solved?.moves ?? -1;
  }

  solve() {
    let i = 0;
    while (true) {
      if (this.maxSearchIteration && i > this.maxSearchIteration) return;
      this.solved = this._main.step();
      if (this.solved) return;
      if (this._twin.step()) return;
      i++;
    }
  }

  stepsToString() {
    return this.solved?.stepsToString();
  }
}
