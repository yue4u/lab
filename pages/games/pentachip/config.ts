import { GameConfig } from "./type";

const config: GameConfig = {
    COLOR: {
        SHADOW: "lightyellow",
        BACKGROUND: "rgb(32,43,65)",
        GRID_LINE: "white",
        GAME: "lightyellow",
        P1: "rgb(103,197,222)",
        P2: "rgb(231,137,133)",
    },
    LATTICE: {
        SIZE: 100,
    },
    GAME_CHIP: {
        RADIUS: 20,
        SPEED: 0.01,
    },
};

export default config;
