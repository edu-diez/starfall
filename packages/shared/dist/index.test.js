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
    (0, vitest_1.it)("exports COLORS array with 21 colors", () => {
        (0, vitest_1.expect)(index_1.COLORS.length).toBe(21);
        (0, vitest_1.expect)(index_1.COLORS[0]).toBe("#FF0000");
        (0, vitest_1.expect)(index_1.COLORS[20]).toBe("#DA70D6");
    });
    (0, vitest_1.it)("Vec2 type works correctly", () => {
        const vec = { x: 10, y: 20 };
        (0, vitest_1.expect)(vec.x).toBe(10);
        (0, vitest_1.expect)(vec.y).toBe(20);
    });
    (0, vitest_1.it)("exports MESSAGE_TYPES constants", () => {
        (0, vitest_1.expect)(index_1.MESSAGE_TYPES.JOIN).toBe("join");
        (0, vitest_1.expect)(index_1.MESSAGE_TYPES.LEAVE).toBe("leave");
        (0, vitest_1.expect)(index_1.MESSAGE_TYPES.MOVE).toBe("move");
        (0, vitest_1.expect)(index_1.MESSAGE_TYPES.WELCOME).toBe("welcome");
        (0, vitest_1.expect)(index_1.MESSAGE_TYPES.PLAYER_JOINED).toBe("playerJoined");
        (0, vitest_1.expect)(index_1.MESSAGE_TYPES.PLAYER_LEFT).toBe("playerLeft");
        (0, vitest_1.expect)(index_1.MESSAGE_TYPES.ERROR).toBe("error");
    });
    (0, vitest_1.it)("MoveMessage type works correctly", () => {
        const msg = {
            direction: { x: 1, y: 0 },
            timestamp: Date.now(),
        };
        (0, vitest_1.expect)(msg.direction.x).toBe(1);
        (0, vitest_1.expect)(msg.direction.y).toBe(0);
        (0, vitest_1.expect)(typeof msg.timestamp).toBe("number");
    });
    (0, vitest_1.it)("JoinMessage type works correctly", () => {
        const msg = { name: "TestPlayer" };
        (0, vitest_1.expect)(msg.name).toBe("TestPlayer");
    });
    (0, vitest_1.it)("WelcomeMessage type works correctly", () => {
        const msg = {
            sessionId: "session-1",
            playerId: "player-1",
            color: "#FF0000",
            phase: index_1.GamePhase.Lobby,
        };
        (0, vitest_1.expect)(msg.sessionId).toBe("session-1");
        (0, vitest_1.expect)(msg.color).toBe("#FF0000");
        (0, vitest_1.expect)(msg.phase).toBe(index_1.GamePhase.Lobby);
    });
    (0, vitest_1.it)("PlayerJoinedMessage type works correctly", () => {
        const msg = {
            sessionId: "session-1",
            name: "TestPlayer",
            color: "#FF0000",
        };
        (0, vitest_1.expect)(msg.name).toBe("TestPlayer");
    });
    (0, vitest_1.it)("PlayerLeftMessage type works correctly", () => {
        const msg = { sessionId: "session-1" };
        (0, vitest_1.expect)(msg.sessionId).toBe("session-1");
    });
    (0, vitest_1.it)("ErrorMessage type works correctly", () => {
        const msg = { message: "Room is full" };
        (0, vitest_1.expect)(msg.message).toBe("Room is full");
    });
});
