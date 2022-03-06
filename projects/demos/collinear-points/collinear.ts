export interface Point {
  x: number;
  y: number;
}

export function parse(text: string) {
  const [_, ...lines] = text.split("\n");
  return lines
    .map((line) => {
      const [x, y] = line.trim().split(/\s+/).map(Number);
      if ([x, y].some((n) => n === undefined || Number.isNaN(n))) return null;
      return { x, y };
    })
    .filter((x): x is Point => Boolean(x));
}

const cmp = (p1: Point, p2: Point) => p1.x >= p2.x && p1.y >= p2.y;
export function getSegments(points: Point[]) {
  const items: [Point, Point][] = [];
  let i = 1;
  points.forEach((p1, i1) => {
    // i don't get why it's supposed to do a merge sort here.
    // using a map seems better?
    let map = new Map<number, number[]>();

    points.forEach((p2, i2) => {
      if (i2 === i1) return;
      if (cmp(p1, p2)) return;
      // slope calculation seems cacheable?
      const slope = (p2.y - p1.y) / (p2.x - p1.x);
      const exist = map.get(slope) ?? [];
      map.set(slope, [...exist, i2]);
    });

    Array.from(map.values()).map((value) => {
      if (value.length < 3) return;

      // distance calculation seems cacheable?
      const sorted = value.sort((a, b) => (cmp(points[a], points[b]) ? 1 : -1));
      items.push([p1, points[sorted.pop()!]]);
      i++;
    });
  });
  return items;
}
