"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/index");
(0, vitest_1.describe)("Shared package", () => {
    (0, vitest_1.it)("exports PlayerRole enum", () => {
        (0, vitest_1.expect)(index_1.PlayerRole.Crewmate).toBe("crewmate");
        (0, vitest_1.expect)(index_1.PlayerRole.Killer).toBe("killer");
    });
    (0, vitest_1.it)("exports PlayerState enum", () => {
        (0, vitest_1.expect)(index_1.PlayerState.Alive).toBe("alive");
        (0, vitest_1.expect)(index_1.PlayerState.Dead).toBe("dead");
        (0, vitest_1.expect)(index_1.PlayerState.Ejected).toBe("ejected");
    });
    (0, vitest_1.it)("exports GamePhase enum", () => {
        (0, vitest_1.expect)(index_1.GamePhase.Lobby).toBe("lobby");
        (0, vitest_1.expect)(index_1.GamePhase.Playing).toBe("playing");
        (0, vitest_1.expect)(index_1.GamePhase.Meeting).toBe("meeting");
        (0, vitest_1.expect)(index_1.GamePhase.GameOver).toBe("gameover");
    });
    (0, vitest_1.it)("exports GAME_CONFIG constants", () => {
        (0, vitest_1.expect)(index_1.GAME_CONFIG.MAP_WIDTH).toBe(1920);
        (0, vitest_1.expect)(index_1.GAME_CONFIG.MAP_HEIGHT).toBe(1080);
        (0, vitest_1.expect)(index_1.GAME_CONFIG.MAX_PLAYERS).toBe(10);
        (0, vitest_1.expect)(index_1.GAME_CONFIG.MIN_PLAYERS).toBe(4);
    });
    (0, vitest_1.it)("exports COLORS array with 10 colors", () => {
        (0, vitest_1.expect)(index_1.COLORS.length).toBe(10);
        (0, vitest_1.expect)(index_1.COLORS[0]).toBe("#FF0000");
        (0, vitest_1.expect)(index_1.COLORS[9]).toBe("#8B4513");
    });
    (0, vitest_1.it)("Vec2 type works correctly", () => {
        const vec = { x: 10, y: 20 };
        (0, vitest_1.expect)(vec.x).toBe(10);
        (0, vitest_1.expect)(vec.y).toBe(20);
    });
});
