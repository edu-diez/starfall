"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const LobbySystem_1 = require("./LobbySystem");
const shared_1 = require("@starfall/shared");
(0, vitest_1.describe)("LobbySystem", () => {
    let state;
    let lobbySystem;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Lobby;
        lobbySystem = new LobbySystem_1.LobbySystem(state);
    });
    (0, vitest_1.it)("identifies lobby phase correctly", () => {
        (0, vitest_1.expect)(lobbySystem.isInLobby()).toBe(true);
        state.phase = shared_1.GamePhase.Playing;
        (0, vitest_1.expect)(lobbySystem.isInLobby()).toBe(false);
    });
    (0, vitest_1.it)("returns correct min and max players", () => {
        (0, vitest_1.expect)(lobbySystem.getMinPlayers()).toBe(shared_1.GAME_CONFIG.MIN_PLAYERS);
        (0, vitest_1.expect)(lobbySystem.getMaxPlayers()).toBe(shared_1.GAME_CONFIG.MAX_PLAYERS);
    });
    (0, vitest_1.it)("tracks player count", () => {
        (0, vitest_1.expect)(lobbySystem.getPlayerCount()).toBe(0);
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        state.players.set("client-1", player1);
        (0, vitest_1.expect)(lobbySystem.getPlayerCount()).toBe(1);
    });
    (0, vitest_1.it)("tracks alive player count", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.state = shared_1.PlayerState.Alive;
        state.players.set("client-1", player1);
        const player2 = new GameRoomState_1.Player();
        player2.sessionId = "client-2";
        player2.state = shared_1.PlayerState.Dead;
        state.players.set("client-2", player2);
        (0, vitest_1.expect)(lobbySystem.getAlivePlayerCount()).toBe(1);
    });
    (0, vitest_1.it)("allows join when in lobby and not full", () => {
        (0, vitest_1.expect)(lobbySystem.canJoin()).toBe(true);
        // Fill the room
        for (let i = 0; i < shared_1.GAME_CONFIG.MAX_PLAYERS; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            state.players.set(`client-${i}`, player);
        }
        (0, vitest_1.expect)(lobbySystem.canJoin()).toBe(false);
    });
    (0, vitest_1.it)("rejects join when not in lobby", () => {
        state.phase = shared_1.GamePhase.Playing;
        (0, vitest_1.expect)(lobbySystem.canJoin()).toBe(false);
    });
    (0, vitest_1.it)("sets ready status in lobby", () => {
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        state.players.set("client-1", player);
        const result = lobbySystem.setReady("client-1", true);
        (0, vitest_1.expect)(result).toBe(true);
        const playerReady = state.players.get("client-1")?.ready;
        (0, vitest_1.expect)(playerReady).toBe(true);
    });
    (0, vitest_1.it)("rejects ready change when not in lobby", () => {
        state.phase = shared_1.GamePhase.Playing;
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        state.players.set("client-1", player);
        const result = lobbySystem.setReady("client-1", true);
        (0, vitest_1.expect)(result).toBe(false);
    });
    (0, vitest_1.it)("rejects ready change for non-existent player", () => {
        const result = lobbySystem.setReady("non-existent", true);
        (0, vitest_1.expect)(result).toBe(false);
    });
    (0, vitest_1.it)("gets ready status", () => {
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        player.ready = true;
        state.players.set("client-1", player);
        (0, vitest_1.expect)(lobbySystem.getReady("client-1")).toBe(true);
        (0, vitest_1.expect)(lobbySystem.getReady("non-existent")).toBeNull();
    });
    (0, vitest_1.it)("calculates canStart with minimum players and all ready", () => {
        // Add minimum players
        for (let i = 0; i < shared_1.GAME_CONFIG.MIN_PLAYERS; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        // Not all ready
        (0, vitest_1.expect)(lobbySystem.canStart()).toBe(false);
        // All ready
        state.players.forEach((player) => {
            player.ready = true;
        });
        (0, vitest_1.expect)(lobbySystem.canStart()).toBe(true);
    });
    (0, vitest_1.it)("requires minimum players to start", () => {
        // Add only 3 players (min is 4)
        for (let i = 0; i < 3; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            player.ready = true;
            state.players.set(`client-${i}`, player);
        }
        (0, vitest_1.expect)(lobbySystem.canStart()).toBe(false);
    });
    (0, vitest_1.it)("handles dead players in canStart calculation", () => {
        // Add 4 players but one is dead
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = i === 3 ? shared_1.PlayerState.Dead : shared_1.PlayerState.Alive;
            player.ready = true;
            state.players.set(`client-${i}`, player);
        }
        // Only 3 alive players, need 4
        (0, vitest_1.expect)(lobbySystem.canStart()).toBe(false);
    });
    (0, vitest_1.it)("handles player join with color assignment", () => {
        const color = lobbySystem.handlePlayerJoin("client-1", "TestPlayer");
        (0, vitest_1.expect)(shared_1.COLORS).toContain(color);
        const player = state.players.get("client-1");
        (0, vitest_1.expect)(player?.name).toBe("TestPlayer");
        (0, vitest_1.expect)(player?.color).toBe(color);
    });
    (0, vitest_1.it)("handles player leave", () => {
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        state.players.set("client-1", player);
        lobbySystem.handlePlayerLeave("client-1");
        (0, vitest_1.expect)(state.players.size).toBe(0);
    });
    (0, vitest_1.it)("handles color change in lobby", () => {
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        player.color = "#FF0000";
        state.players.set("client-1", player);
        const newColor = lobbySystem.handleColorChange("client-1", "#0000FF");
        (0, vitest_1.expect)(newColor).toBe("#0000FF");
        const updatedPlayer = state.players.get("client-1");
        (0, vitest_1.expect)(updatedPlayer?.color).toBe("#0000FF");
    });
    (0, vitest_1.it)("rejects color change when not in lobby", () => {
        state.phase = shared_1.GamePhase.Playing;
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        player.color = "#FF0000";
        state.players.set("client-1", player);
        const newColor = lobbySystem.handleColorChange("client-1", "#0000FF");
        (0, vitest_1.expect)(newColor).toBeNull();
    });
    (0, vitest_1.it)("rejects color change to taken color", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        const player2 = new GameRoomState_1.Player();
        player2.sessionId = "client-2";
        player2.color = "#0000FF";
        state.players.set("client-2", player2);
        const newColor = lobbySystem.handleColorChange("client-1", "#0000FF");
        (0, vitest_1.expect)(newColor).toBeNull();
    });
    (0, vitest_1.it)("returns lobby state for synchronization", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.name = "Player1";
        player1.color = "#FF0000";
        player1.ready = true;
        state.players.set("client-1", player1);
        const player2 = new GameRoomState_1.Player();
        player2.sessionId = "client-2";
        player2.name = "Player2";
        player2.color = "#0000FF";
        player2.ready = false;
        state.players.set("client-2", player2);
        const lobbyState = lobbySystem.getLobbyState();
        (0, vitest_1.expect)(lobbyState.players.length).toBe(2);
        (0, vitest_1.expect)(lobbyState.minPlayers).toBe(shared_1.GAME_CONFIG.MIN_PLAYERS);
        (0, vitest_1.expect)(lobbyState.maxPlayers).toBe(shared_1.GAME_CONFIG.MAX_PLAYERS);
        (0, vitest_1.expect)(lobbyState.canStart).toBe(false); // Not all ready
    });
});
