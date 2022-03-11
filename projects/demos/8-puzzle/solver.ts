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
}

export class Solver {
  _board: Board;
  _pq: MinPriorityQueue<SearchNode>;
  solved?: SearchNode;
  seen = new Set<string>();

  constructor(board: Board) {
    this._board = board;
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
    this.seen.add(board.id);
    this.solve();
  }

  static fromPuzzle(source: string) {
    return new Solver(Board.from(source));
  }

  get solvable() {
    return Boolean(this.solved);
  }

  get moves() {
    return this.solved?.moves ?? -1;
  }

  solve() {
    while (!this._pq.isEmpty()) {
      const { element: node } =
        this._pq.dequeue() as PriorityQueueItem<SearchNode>;
      if (node.current.isGoal) {
        this.solved = node;
        return node;
      }
      for (const neighbor of node.current.neighbors()) {
        const id = neighbor.id;
        if (this.seen.has(id)) {
          continue;
        }
        this.seen.add(id);
        this._pq.enqueue(
          new SearchNode({
            prev: node,
            current: neighbor,
            moves: node.moves + 1,
          })
        );
      }
    }
  }

  steps() {
    const init = this._board;
    const steps = Array.from(this.solution());
    return [init, ...steps];
  }

  stepsToString() {
    return this.steps()
      .map((b) => b?.toString())
      .join("\n---\n");
  }

  *solution(): IterableIterator<Board | null> {
    if (!this.solved) return null;
    let node = this.solved;
    const steps: Board[] = [];
    while (node.prev) {
      steps.unshift(node.current);
      node = node.prev;
    }
    for (const board of steps) {
      yield board;
    }
  }
}
