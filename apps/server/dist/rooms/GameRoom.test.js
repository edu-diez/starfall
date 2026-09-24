"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoom_1 = require("./GameRoom");
const GameRoomState_1 = require("./schema/GameRoomState");
const shared_1 = require("@amongus/shared");
// Mock Colyseus Room and Client
const mockClient = (sessionId) => ({
    sessionId,
    send: vitest_1.vi.fn(),
});
const mockBroadcast = vitest_1.vi.fn();
(0, vitest_1.describe)("GameRoom", () => {
    let room;
    let mockRoom;
    (0, vitest_1.beforeEach)(() => {
        room = new GameRoom_1.GameRoom();
        mockRoom = room;
        mockRoom.state = new GameRoomState_1.GameRoomState();
        mockRoom.broadcast = mockBroadcast;
        mockBroadcast.mockClear();
    });
    (0, vitest_1.it)("initializes with Lobby phase", () => {
        mockRoom.onCreate({});
        (0, vitest_1.expect)(mockRoom.state.phase).toBe(shared_1.GamePhase.Lobby);
    });
    (0, vitest_1.it)("creates a player on join message", () => {
        mockRoom.onCreate({});
        const client = mockClient("client-1");
        mockRoom.handleJoin(client, { name: "TestPlayer" });
        (0, vitest_1.expect)(mockRoom.state.players.size).toBe(1);
        const player = mockRoom.state.players.get("client-1");
        (0, vitest_1.expect)(player).toBeDefined();
        (0, vitest_1.expect)(player?.name).toBe("TestPlayer");
        (0, vitest_1.expect)(player?.sessionId).toBe("client-1");
        (0, vitest_1.expect)(player?.state).toBe(shared_1.PlayerState.Alive);
        (0, vitest_1.expect)(player?.role).toBe(shared_1.PlayerRole.Crewmate);
    });
    (0, vitest_1.it)("assigns unique colors to players", () => {
        mockRoom.onCreate({});
        const client1 = mockClient("client-1");
        const client2 = mockClient("client-2");
        mockRoom.handleJoin(client1, { name: "Player1" });
        mockRoom.handleJoin(client2, { name: "Player2" });
        const player1 = mockRoom.state.players.get("client-1");
        const player2 = mockRoom.state.players.get("client-2");
        (0, vitest_1.expect)(player1?.color).not.toBe(player2?.color);
    });
    (0, vitest_1.it)("removes player on leave", () => {
        mockRoom.onCreate({});
        const client = mockClient("client-1");
        mockRoom.handleJoin(client, { name: "TestPlayer" });
        (0, vitest_1.expect)(mockRoom.state.players.size).toBe(1);
        mockRoom.handleLeave(client);
        (0, vitest_1.expect)(mockRoom.state.players.size).toBe(0);
    });
    (0, vitest_1.it)("rejects join when room is full", () => {
        mockRoom.onCreate({});
        mockRoom.maxClients = 2;
        const client1 = mockClient("client-1");
        const client2 = mockClient("client-2");
        const client3 = mockClient("client-3");
        mockRoom.handleJoin(client1, { name: "Player1" });
        mockRoom.handleJoin(client2, { name: "Player2" });
        mockRoom.handleJoin(client3, { name: "Player3" });
        (0, vitest_1.expect)(mockRoom.state.players.size).toBe(2);
        (0, vitest_1.expect)(client3.send).toHaveBeenCalledWith("error", { message: "Room is full" });
    });
});
(0, vitest_1.describe)("GameRoomState", () => {
    (0, vitest_1.it)("creates player with correct defaults", () => {
        const state = new GameRoomState_1.GameRoomState();
        const player = state.createPlayer("session-1", "TestPlayer", "#FF0000");
        (0, vitest_1.expect)(player.sessionId).toBe("session-1");
        (0, vitest_1.expect)(player.name).toBe("TestPlayer");
        (0, vitest_1.expect)(player.color).toBe("#FF0000");
        (0, vitest_1.expect)(player.x).toBe(960);
        (0, vitest_1.expect)(player.y).toBe(540);
        (0, vitest_1.expect)(player.role).toBe(shared_1.PlayerRole.Crewmate);
        (0, vitest_1.expect)(player.state).toBe(shared_1.PlayerState.Alive);
    });
});
