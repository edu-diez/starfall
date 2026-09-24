"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const ColorSystem_1 = require("./ColorSystem");
const shared_1 = require("@starfall/shared");
(0, vitest_1.describe)("ColorSystem", () => {
    let state;
    let colorSystem;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        colorSystem = new ColorSystem_1.ColorSystem(state);
    });
    (0, vitest_1.it)("returns empty used colors when no players", () => {
        const used = colorSystem.getUsedColors();
        (0, vitest_1.expect)(used.size).toBe(0);
    });
    (0, vitest_1.it)("tracks used colors from players", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        const player2 = new GameRoomState_1.Player();
        player2.sessionId = "client-2";
        player2.color = "#0000FF";
        state.players.set("client-2", player2);
        const used = colorSystem.getUsedColors();
        (0, vitest_1.expect)(used.size).toBe(2);
        (0, vitest_1.expect)(used.has("#FF0000")).toBe(true);
        (0, vitest_1.expect)(used.has("#0000FF")).toBe(true);
    });
    (0, vitest_1.it)("returns first available color", () => {
        const available = colorSystem.getAvailableColor();
        (0, vitest_1.expect)(shared_1.COLORS).toContain(available);
    });
    (0, vitest_1.it)("returns next available color when first is taken", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = shared_1.COLORS[0];
        state.players.set("client-1", player1);
        const available = colorSystem.getAvailableColor();
        (0, vitest_1.expect)(available).toBe(shared_1.COLORS[1]);
    });
    (0, vitest_1.it)("checks color availability correctly", () => {
        (0, vitest_1.expect)(colorSystem.isColorAvailable("#FF0000")).toBe(true);
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        (0, vitest_1.expect)(colorSystem.isColorAvailable("#FF0000")).toBe(false);
        (0, vitest_1.expect)(colorSystem.isColorAvailable("#FF0000", "client-1")).toBe(true); // Exclude self
        (0, vitest_1.expect)(colorSystem.isColorAvailable("#0000FF")).toBe(true);
    });
    (0, vitest_1.it)("assigns requested color when available", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        const assigned = colorSystem.assignColor("client-1", "#0000FF");
        (0, vitest_1.expect)(assigned).toBe("#0000FF");
        const player = state.players.get("client-1");
        (0, vitest_1.expect)(player?.color).toBe("#0000FF");
    });
    (0, vitest_1.it)("rejects assignment of taken color", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        const player2 = new GameRoomState_1.Player();
        player2.sessionId = "client-2";
        player2.color = "#0000FF";
        state.players.set("client-2", player2);
        const assigned = colorSystem.assignColor("client-1", "#0000FF");
        (0, vitest_1.expect)(assigned).toBeNull();
    });
    (0, vitest_1.it)("rejects assignment of unknown color", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        const assigned = colorSystem.assignColor("client-1", "#123456");
        (0, vitest_1.expect)(assigned).toBeNull();
    });
    (0, vitest_1.it)("auto-assigns available color when none requested", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        const assigned = colorSystem.assignColor("client-1");
        (0, vitest_1.expect)(assigned).toBe(shared_1.COLORS[1]);
    });
    (0, vitest_1.it)("returns null for non-existent player", () => {
        const assigned = colorSystem.assignColor("non-existent", "#0000FF");
        (0, vitest_1.expect)(assigned).toBeNull();
    });
    (0, vitest_1.it)("returns all colors from catalog", () => {
        const allColors = colorSystem.getAllColors();
        (0, vitest_1.expect)(allColors).toEqual(shared_1.COLORS);
        (0, vitest_1.expect)(allColors.length).toBe(21);
    });
    (0, vitest_1.it)("returns color availability map", () => {
        const player1 = new GameRoomState_1.Player();
        player1.sessionId = "client-1";
        player1.color = "#FF0000";
        state.players.set("client-1", player1);
        const availability = colorSystem.getColorAvailability();
        (0, vitest_1.expect)(availability.size).toBe(shared_1.COLORS.length);
        const redAvailability = availability.get("#FF0000");
        (0, vitest_1.expect)(redAvailability?.available).toBe(false);
        (0, vitest_1.expect)(redAvailability?.owner).toBe("client-1");
        const blueAvailability = availability.get("#0000FF");
        (0, vitest_1.expect)(blueAvailability?.available).toBe(true);
        (0, vitest_1.expect)(blueAvailability?.owner).toBeUndefined();
    });
});
