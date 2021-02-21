export interface GameConfig {
    COLOR: {
        BACKGROUND: string,
        GRID_LINE: string,
        SHADOW: string,
        GAME: string,
        P1: string;
        P2: string;
    };
    LATTICE: {
        SIZE: number;
    };
    GAME_CHIP: {
        RADIUS: number;
        SPEED: number
    };
}

export interface Renderable {
    render(): void;
}

export type AxisPoint = number;

export type GameChipPositionArray = [AxisPoint, AxisPoint];

export interface GameChipPosition {
    x: AxisPoint;
    y: AxisPoint;
}

export interface GameChipHintInfo {
    hints: GameChipPosition[];
    chip: GameChipInterface;
}

export type PlayerIndex = "P1" | "P2" | "GAME";

export interface GameChipInterface extends Renderable {
    id: string;
    position: GameChipPosition;
    ownedBy: PlayerIndex;
    selected: boolean;
    hover: boolean;
}

export interface BoardState {
    map: GameChipPosition[];
    chips: GameChipInterface[];
}

export interface GameState {
    turn: PlayerIndex;
    board: BoardState;
}

export interface DirectionMap {
    [s: string]: Direction[];
}
export interface BoardInterface extends Renderable {
    vectors: Vectors;
    directionMap: DirectionMap;
    load(): BoardState;
}

export type Direction =
    "topLeft" |
    "top" |
    "topRight" |
    "left" |
    "right" |
    "downLeft" |
    "down" |
    "downRight";

export type Vectors= {
    [direction in Direction]: GameChipPosition;
};

export interface BoardPositionPath {
    from: GameChipPositionArray;
    to: GameChipPositionArray;
}

export type BoardPaths = BoardPositionPath[];

export interface Player {
    index: PlayerIndex;
}
