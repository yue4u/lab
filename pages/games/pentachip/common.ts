import { GameChipPosition } from "./type";

export function stringToPosition(s: string): GameChipPosition {
    const [x, y] = s.split("-").map(parseInt);
    return { x, y };
}

export function PositionToSting(position: GameChipPosition): string {
    return `${position.x}-${position.y}`;
}

export default {
    stringToPosition,
    PositionToSting,
};
