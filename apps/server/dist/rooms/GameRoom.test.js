"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoom_1 = require("./GameRoom");
const GameRoomState_1 = require("./schema/GameRoomState");
const shared_1 = require("@starfall/shared");
// Mock Colyseus Room and Client
const mockClient = (sessionId) => ({
    sessionId,
    auth: {
        id: `account-${sessionId}`,
        displayName: "TestPlayer",
        preferences: { soundEnabled: true },
    },
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
        (0, vitest_1.expect)(player?.accountId).toBe("account-client-1");
        (0, vitest_1.expect)(player?.sessionId).toBe("client-1");
        (0, vitest_1.expect)(player?.state).toBe(shared_1.PlayerState.Alive);
        // Role is no longer in public state (private role assignment)
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
    (0, vitest_1.it)("uses the authenticated profile instead of a client-supplied name", () => {
        mockRoom.onCreate({});
        const client = mockClient("client-1");
        client.auth.displayName = "Authorized Pilot";
        mockRoom.handleJoin(client, { name: "Forged Name" });
        (0, vitest_1.expect)(mockRoom.state.players.get("client-1")?.name).toBe("Authorized Pilot");
    });
    (0, vitest_1.it)("keeps account credentials out of public room state", () => {
        mockRoom.onCreate({});
        const client = mockClient("client-1");
        mockRoom.handleJoin(client, {});
        const publicPlayer = mockRoom.state.players.get("client-1");
        (0, vitest_1.expect)(Object.keys(publicPlayer)).not.toContain("credential");
        (0, vitest_1.expect)(JSON.stringify(publicPlayer)).not.toContain("starfall_account");
    });
    (0, vitest_1.it)("patch-encodes a joined player", () => {
        mockRoom.onCreate({});
        const client = mockClient("client-1");
        mockRoom.handleJoin(client, {});
        (0, vitest_1.expect)(() => mockRoom._serializer.applyPatches()).not.toThrow();
    });
    (0, vitest_1.it)("removes player on leave", () => {
        mockRoom.onCreate({});
        const client = mockClient("client-1");
        mockRoom.handleJoin(client, { name: "TestPlayer" });
        (0, vitest_1.expect)(mockRoom.state.players.size).toBe(1);
        mockRoom.handleLeave(client);
        (0, vitest_1.expect)(mockRoom.state.players.size).toBe(0);
    });
    (0, vitest_1.describe)("Reconnection", () => {
        (0, vitest_1.it)("neutralizes input and retains the existing player during the grace window", () => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, {});
            mockRoom.state.phase = shared_1.GamePhase.Playing;
            mockRoom.handleMove(client, {
                direction: { x: 1, y: 0 },
                timestamp: Date.now(),
            });
            mockRoom.roleAssignmentSystem["roleMap"].set("client-1", shared_1.PlayerRole.Killer);
            mockRoom.allowReconnection = vitest_1.vi.fn(() => new Promise(() => { }));
            mockRoom.onDrop(client);
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
            (0, vitest_1.expect)(mockRoom.state.players.get("client-1")).toMatchObject({
                isConnected: false,
            });
            (0, vitest_1.expect)(mockRoom.roleAssignmentSystem.getRole("client-1")).toBe(shared_1.PlayerRole.Killer);
        });
        (0, vitest_1.it)("restores the same player and sends private recovery only to the reconnecting client", () => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, {});
            mockRoom.roleAssignmentSystem["roleMap"].set("client-1", shared_1.PlayerRole.Killer);
            mockRoom.killSystem["killCooldownUntil"].set("client-1", Date.now() + 10_000);
            mockRoom.state.players.get("client-1").isConnected = false;
            mockRoom.reconnectingSessionIds.add("client-1");
            const reconnectedClient = mockClient("client-1");
            mockRoom.onReconnect(reconnectedClient);
            (0, vitest_1.expect)(mockRoom.state.players.size).toBe(1);
            (0, vitest_1.expect)(mockRoom.state.players.get("client-1")?.isConnected).toBe(true);
            (0, vitest_1.expect)(reconnectedClient.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.RECONNECTION_STATE, vitest_1.expect.objectContaining({
                role: shared_1.PlayerRole.Killer,
                killCooldownRemaining: vitest_1.expect.any(Number),
            }));
            (0, vitest_1.expect)(mockBroadcast).not.toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.RECONNECTION_STATE, vitest_1.expect.anything());
        });
        (0, vitest_1.it)("removes public and private state only after permanent departure", () => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, {});
            mockRoom.roleAssignmentSystem["roleMap"].set("client-1", shared_1.PlayerRole.Killer);
            mockRoom.killSystem["killCooldownUntil"].set("client-1", Date.now());
            mockRoom.meetingSystem["meetingsUsed"].set("client-1", 1);
            mockRoom.votingSystem["eligibleVoters"].add("client-1");
            mockRoom.handlePermanentLeave("client-1");
            (0, vitest_1.expect)(mockRoom.state.players.has("client-1")).toBe(false);
            (0, vitest_1.expect)(mockRoom.roleAssignmentSystem.getRole("client-1")).toBeUndefined();
            (0, vitest_1.expect)(mockRoom.killSystem.getCooldownRemaining("client-1")).toBe(0);
            (0, vitest_1.expect)(mockRoom.meetingSystem.getMeetingsRemaining("client-1")).toBe(1);
            (0, vitest_1.expect)(mockRoom.votingSystem.getEligibleVoterIds()).not.toContain("client-1");
        });
        (0, vitest_1.it)("rejects a second session for an account already represented in the room", () => {
            mockRoom.onCreate({});
            const originalClient = mockClient("client-1");
            const duplicateClient = mockClient("client-2");
            duplicateClient.auth.id = originalClient.auth.id;
            mockRoom.handleJoin(originalClient, {});
            mockRoom.handleJoin(duplicateClient, {});
            (0, vitest_1.expect)(mockRoom.state.players.size).toBe(1);
            (0, vitest_1.expect)(duplicateClient.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Account already has a player in this room",
            });
        });
    });
    (0, vitest_1.it)("rejects join when room is full", () => {
        mockRoom.onCreate({});
        // Use the actual max players from config (10)
        // Fill up to max players
        for (let i = 1; i <= shared_1.GAME_CONFIG.MAX_PLAYERS; i++) {
            const client = mockClient(`client-${i}`);
            mockRoom.handleJoin(client, { name: `Player${i}` });
        }
        // Try to add one more
        const extraClient = mockClient("client-extra");
        mockRoom.handleJoin(extraClient, { name: "ExtraPlayer" });
        (0, vitest_1.expect)(mockRoom.state.players.size).toBe(shared_1.GAME_CONFIG.MAX_PLAYERS);
        (0, vitest_1.expect)(extraClient.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
            message: "Cannot join at this time",
        });
    });
    // Movement tests
    (0, vitest_1.describe)("Movement System", () => {
        (0, vitest_1.beforeEach)(() => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, { name: "TestPlayer" });
            // Set phase to Playing for movement tests
            mockRoom.state.phase = shared_1.GamePhase.Playing;
        });
        (0, vitest_1.it)("stores validated movement input", () => {
            const client = mockClient("client-1");
            const direction = { x: 1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            const storedInput = mockRoom.playerInputs.get("client-1");
            (0, vitest_1.expect)(storedInput).toBeDefined();
            (0, vitest_1.expect)(storedInput?.direction.x).toBe(1);
            (0, vitest_1.expect)(storedInput?.direction.y).toBe(0);
        });
        (0, vitest_1.it)("rejects malformed movement payloads without throwing or mutating input", () => {
            const client = mockClient("client-1");
            (0, vitest_1.expect)(() => mockRoom.handleMove(client, null)).not.toThrow();
            (0, vitest_1.expect)(() => mockRoom.handleMove(client, { direction: null })).not.toThrow();
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
        });
        (0, vitest_1.it)("rejects non-finite input", () => {
            const client = mockClient("client-1");
            // Test NaN
            mockRoom.handleMove(client, {
                direction: { x: NaN, y: 0 },
                timestamp: Date.now(),
            });
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
            // Test Infinity
            mockRoom.handleMove(client, {
                direction: { x: Infinity, y: 0 },
                timestamp: Date.now(),
            });
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
            // Test non-finite timestamp
            mockRoom.handleMove(client, {
                direction: { x: 1, y: 0 },
                timestamp: NaN,
            });
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
        });
        (0, vitest_1.it)("normalizes diagonal input to unit vector", () => {
            const client = mockClient("client-1");
            // Diagonal input with magnitude > 1
            const direction = { x: 1, y: 1 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            const storedInput = mockRoom.playerInputs.get("client-1");
            (0, vitest_1.expect)(storedInput).toBeDefined();
            // Should be normalized to unit vector
            const magnitude = Math.sqrt(storedInput.direction.x ** 2 + storedInput.direction.y ** 2);
            (0, vitest_1.expect)(magnitude).toBeCloseTo(1, 5);
        });
        (0, vitest_1.it)("does not accept movement from unknown player", () => {
            const client = mockClient("unknown-client");
            const direction = { x: 1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            (0, vitest_1.expect)(mockRoom.playerInputs.has("unknown-client")).toBe(false);
        });
        (0, vitest_1.it)("does not accept movement from dead player", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            if (player) {
                player.state = shared_1.PlayerState.Dead;
            }
            const direction = { x: 1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
        });
        (0, vitest_1.it)("applies world boundaries during tick", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            // Place player at left edge
            if (player) {
                player.x = shared_1.GAME_CONFIG.PLAYER_RADIUS;
                player.y = shared_1.GAME_CONFIG.MAP_HEIGHT / 2;
            }
            // Try to move left (outside boundary)
            const direction = { x: -1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            // Simulate a tick with deltaTime = 1 second
            mockRoom.lastTickTime = Date.now() - 1000;
            mockRoom.tick();
            // Player should not go past left boundary
            (0, vitest_1.expect)(player?.x).toBeGreaterThanOrEqual(shared_1.GAME_CONFIG.PLAYER_RADIUS);
        });
        (0, vitest_1.it)("applies right boundary during tick", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            // Place player at right edge
            if (player) {
                player.x = shared_1.GAME_CONFIG.MAP_WIDTH - shared_1.GAME_CONFIG.PLAYER_RADIUS;
                player.y = shared_1.GAME_CONFIG.MAP_HEIGHT / 2;
            }
            // Try to move right (outside boundary)
            const direction = { x: 1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            // Simulate a tick with deltaTime = 1 second
            mockRoom.lastTickTime = Date.now() - 1000;
            mockRoom.tick();
            // Player should not go past right boundary
            (0, vitest_1.expect)(player?.x).toBeLessThanOrEqual(shared_1.GAME_CONFIG.MAP_WIDTH - shared_1.GAME_CONFIG.PLAYER_RADIUS);
        });
        (0, vitest_1.it)("applies top boundary during tick", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            // Place player at top edge
            if (player) {
                player.x = shared_1.GAME_CONFIG.MAP_WIDTH / 2;
                player.y = shared_1.GAME_CONFIG.PLAYER_RADIUS;
            }
            // Try to move up (outside boundary)
            const direction = { x: 0, y: -1 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            // Simulate a tick with deltaTime = 1 second
            mockRoom.lastTickTime = Date.now() - 1000;
            mockRoom.tick();
            // Player should not go past top boundary
            (0, vitest_1.expect)(player?.y).toBeGreaterThanOrEqual(shared_1.GAME_CONFIG.PLAYER_RADIUS);
        });
        (0, vitest_1.it)("applies bottom boundary during tick", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            // Place player at bottom edge
            if (player) {
                player.x = shared_1.GAME_CONFIG.MAP_WIDTH / 2;
                player.y = shared_1.GAME_CONFIG.MAP_HEIGHT - shared_1.GAME_CONFIG.PLAYER_RADIUS;
            }
            // Try to move down (outside boundary)
            const direction = { x: 0, y: 1 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            // Simulate a tick with deltaTime = 1 second
            mockRoom.lastTickTime = Date.now() - 1000;
            mockRoom.tick();
            // Player should not go past bottom boundary
            (0, vitest_1.expect)(player?.y).toBeLessThanOrEqual(shared_1.GAME_CONFIG.MAP_HEIGHT - shared_1.GAME_CONFIG.PLAYER_RADIUS);
        });
        (0, vitest_1.it)("movement distance is determined by server time and speed", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            // Place player in central corridor (open area) where they can move freely
            // Central corridor spans x=800 to x=1120, walls at x=800 and x=1100
            // Player radius is 16, so valid range is x=816 to x=1084
            // Place at x=850 to allow 200px movement right to x=1050 (well within bounds)
            if (player) {
                player.x = 850;
                player.y = 540;
            }
            // Move right at full speed
            const direction = { x: 1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            // Simulate a tick with deltaTime = 1 second
            mockRoom.lastTickTime = Date.now() - 1000;
            mockRoom.tick();
            // A stalled event loop is clamped to protect simulation fairness.
            const expectedX = 850 + shared_1.GAME_CONFIG.PLAYER_SPEED * 0.1;
            (0, vitest_1.expect)(player?.x).toBeCloseTo(expectedX, 0);
        });
        (0, vitest_1.it)("does not simulate movement in Lobby phase", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            if (player) {
                player.x = shared_1.GAME_CONFIG.MAP_WIDTH / 2;
                player.y = shared_1.GAME_CONFIG.MAP_HEIGHT / 2;
            }
            // Set phase to Lobby
            mockRoom.state.phase = shared_1.GamePhase.Lobby;
            const direction = { x: 1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            // Simulate a tick
            mockRoom.lastTickTime = Date.now() - 1000;
            mockRoom.tick();
            // Player should not move in Lobby phase
            (0, vitest_1.expect)(player?.x).toBe(shared_1.GAME_CONFIG.MAP_WIDTH / 2);
        });
        (0, vitest_1.it)("clears player input on leave", () => {
            const client = mockClient("client-1");
            const direction = { x: 1, y: 0 };
            mockRoom.handleMove(client, { direction, timestamp: Date.now() });
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(true);
            mockRoom.handleLeave(client);
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
        });
        (0, vitest_1.it)("blocks cached and new movement while a player is venting", () => {
            const client = mockClient("client-1");
            const player = mockRoom.state.players.get("client-1");
            player.x = 960;
            player.y = 150;
            mockRoom.roleAssignmentSystem["roleMap"].set("client-1", shared_1.PlayerRole.Killer);
            mockRoom.handleMove(client, {
                direction: { x: 1, y: 0 },
                timestamp: Date.now(),
            });
            mockRoom.handleVentEnter(client, { nodeId: "vent-bridge" });
            (0, vitest_1.expect)(mockRoom.ventSystem.isVenting("client-1")).toBe(true);
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
            mockRoom.handleMove(client, {
                direction: { x: 1, y: 0 },
                timestamp: Date.now(),
            });
            (0, vitest_1.expect)(mockRoom.playerInputs.has("client-1")).toBe(false);
            const positionBeforeTick = { x: player.x, y: player.y };
            mockRoom.lastTickTime = Date.now() - 1000;
            mockRoom.tick();
            (0, vitest_1.expect)(player).toMatchObject(positionBeforeTick);
        });
    });
    // Lobby and Color System tests
    (0, vitest_1.describe)("Vent System", () => {
        (0, vitest_1.beforeEach)(() => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, { name: "Killer" });
            mockRoom.state.phase = shared_1.GamePhase.Playing;
            const player = mockRoom.state.players.get("client-1");
            player.x = 960;
            player.y = 150;
            mockRoom.roleAssignmentSystem["roleMap"].set("client-1", shared_1.PlayerRole.Killer);
        });
        (0, vitest_1.it)("rejects malformed vent payloads before mutation", () => {
            const client = mockClient("client-1");
            mockRoom.handleVentEnter(client, {});
            (0, vitest_1.expect)(mockRoom.ventSystem.isVenting("client-1")).toBe(false);
            (0, vitest_1.expect)(client.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.VENT_STATE, vitest_1.expect.objectContaining({
                success: false,
                reason: "Vent node must be a string",
            }));
        });
        (0, vitest_1.it)("cleans vent state when a meeting begins", () => {
            const client = mockClient("client-1");
            mockRoom.handleVentEnter(client, { nodeId: "vent-bridge" });
            (0, vitest_1.expect)(mockRoom.ventSystem.isVenting("client-1")).toBe(true);
            mockRoom.handleCallMeeting(client, {});
            (0, vitest_1.expect)(mockRoom.ventSystem.isVenting("client-1")).toBe(false);
            (0, vitest_1.expect)(mockRoom.state.phase).toBe(shared_1.GamePhase.Meeting);
        });
        (0, vitest_1.it)("cleans vent state when a player leaves", () => {
            const client = mockClient("client-1");
            mockRoom.handleVentEnter(client, { nodeId: "vent-bridge" });
            mockRoom.handleLeave(client);
            (0, vitest_1.expect)(mockRoom.ventSystem.isVenting("client-1")).toBe(false);
        });
    });
    (0, vitest_1.describe)("Lobby System", () => {
        (0, vitest_1.beforeEach)(() => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, { name: "TestPlayer" });
        });
        (0, vitest_1.it)("initializes with Lobby phase", () => {
            (0, vitest_1.expect)(mockRoom.state.phase).toBe(shared_1.GamePhase.Lobby);
        });
        (0, vitest_1.it)("assigns unique colors to joining players", () => {
            const client1 = mockClient("client-1");
            const client2 = mockClient("client-2");
            const client3 = mockClient("client-3");
            mockRoom.handleJoin(client1, { name: "Player1" });
            mockRoom.handleJoin(client2, { name: "Player2" });
            mockRoom.handleJoin(client3, { name: "Player3" });
            const colors = new Set();
            mockRoom.state.players.forEach((player) => colors.add(player.color));
            (0, vitest_1.expect)(colors.size).toBe(3);
        });
        (0, vitest_1.it)("rejects join when not in lobby phase", () => {
            mockRoom.state.phase = shared_1.GamePhase.Playing;
            const client = mockClient("client-new");
            mockRoom.handleJoin(client, { name: "NewPlayer" });
            (0, vitest_1.expect)(mockRoom.state.players.size).toBe(1); // Original player only
            (0, vitest_1.expect)(client.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Cannot join at this time",
            });
        });
        (0, vitest_1.it)("rejects join when room is full", () => {
            // Fill up to max players
            for (let i = 1; i <= shared_1.GAME_CONFIG.MAX_PLAYERS; i++) {
                const client = mockClient(`client-${i}`);
                mockRoom.handleJoin(client, { name: `Player${i}` });
            }
            // Try to add one more
            const extraClient = mockClient("client-extra");
            mockRoom.handleJoin(extraClient, { name: "ExtraPlayer" });
            (0, vitest_1.expect)(mockRoom.state.players.size).toBe(shared_1.GAME_CONFIG.MAX_PLAYERS);
            (0, vitest_1.expect)(extraClient.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Cannot join at this time",
            });
        });
        (0, vitest_1.it)("releases color when player leaves", () => {
            const client1 = mockClient("client-1");
            const client2 = mockClient("client-2");
            mockRoom.handleJoin(client1, { name: "Player1" });
            mockRoom.handleJoin(client2, { name: "Player2" });
            const color1 = mockRoom.state.players.get("client-1")?.color;
            const color2 = mockRoom.state.players.get("client-2")?.color;
            mockRoom.handleLeave(client1);
            // New player should be able to get the released color
            const client3 = mockClient("client-3");
            mockRoom.handleJoin(client3, { name: "Player3" });
            const color3 = mockRoom.state.players.get("client-3")?.color;
            (0, vitest_1.expect)(color3).toBe(color1); // Should get the released color
        });
    });
    (0, vitest_1.describe)("Command hardening", () => {
        (0, vitest_1.beforeEach)(() => {
            mockRoom.onCreate({});
            mockRoom.handleJoin(mockClient("client-1"), {});
        });
        (0, vitest_1.it)("rejects malformed discrete command payloads without mutating state", () => {
            const client = mockClient("client-1");
            const originalColor = mockRoom.state.players.get("client-1").color;
            (0, vitest_1.expect)(() => mockRoom.handleColorChange(client, null)).not.toThrow();
            (0, vitest_1.expect)(() => mockRoom.handleReady(client, { ready: "yes" })).not.toThrow();
            (0, vitest_1.expect)(() => mockRoom.handleKill(client, { targetSessionId: null })).not.toThrow();
            (0, vitest_1.expect)(() => mockRoom.handleVote(client, null)).not.toThrow();
            (0, vitest_1.expect)(mockRoom.state.players.get("client-1").color).toBe(originalColor);
            (0, vitest_1.expect)(mockRoom.state.players.get("client-1").ready).toBe(false);
        });
        (0, vitest_1.it)("clears private kill cooldowns before a fresh match", () => {
            const clients = ["client-1", "client-2", "client-3", "client-4"].map(mockClient);
            clients.slice(1).forEach((client) => mockRoom.handleJoin(client, {}));
            clients.forEach((client) => mockRoom.handleReady(client, { ready: true }));
            mockRoom.killSystem["killCooldownUntil"].set("client-1", Date.now() + 30_000);
            mockRoom.handleMatchStart(clients[0], {});
            (0, vitest_1.expect)(mockRoom.killSystem.getCooldownRemaining("client-1")).toBe(0);
        });
    });
    (0, vitest_1.describe)("Color System", () => {
        (0, vitest_1.beforeEach)(() => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, { name: "TestPlayer" });
        });
        (0, vitest_1.it)("allows color change to available color in lobby", () => {
            const client = mockClient("client-1");
            const newColor = "#0000FF"; // Blue
            mockRoom.handleColorChange(client, { color: newColor });
            const player = mockRoom.state.players.get("client-1");
            (0, vitest_1.expect)(player?.color).toBe(newColor);
            (0, vitest_1.expect)(mockBroadcast).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.COLOR_CHANGE, {
                sessionId: "client-1",
                color: newColor,
            });
        });
        (0, vitest_1.it)("rejects color change to already taken color", () => {
            const client1 = mockClient("client-1");
            const client2 = mockClient("client-2");
            mockRoom.handleJoin(client1, { name: "Player1" });
            mockRoom.handleJoin(client2, { name: "Player2" });
            const color1 = mockRoom.state.players.get("client-1")?.color;
            // Try to change client2's color to client1's color
            mockRoom.handleColorChange(client2, { color: color1 });
            const player2 = mockRoom.state.players.get("client-2");
            (0, vitest_1.expect)(player2?.color).not.toBe(color1);
            (0, vitest_1.expect)(client2.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Color already in use",
            });
        });
        (0, vitest_1.it)("rejects color change to unknown color", () => {
            const client = mockClient("client-1");
            const unknownColor = "#123456"; // Not in COLORS
            mockRoom.handleColorChange(client, { color: unknownColor });
            (0, vitest_1.expect)(client.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Unknown color",
            });
        });
        (0, vitest_1.it)("rejects color change when not in lobby", () => {
            mockRoom.state.phase = shared_1.GamePhase.Playing;
            const client = mockClient("client-1");
            const newColor = "#0000FF";
            mockRoom.handleColorChange(client, { color: newColor });
            (0, vitest_1.expect)(client.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Color changes only allowed in lobby",
            });
        });
    });
    (0, vitest_1.describe)("Ready System", () => {
        (0, vitest_1.beforeEach)(() => {
            mockRoom.onCreate({});
            const client = mockClient("client-1");
            mockRoom.handleJoin(client, { name: "TestPlayer" });
        });
        (0, vitest_1.it)("allows ready toggle in lobby", () => {
            const client = mockClient("client-1");
            mockRoom.handleReady(client, { ready: true });
            const player = mockRoom.state.players.get("client-1");
            (0, vitest_1.expect)(player?.ready).toBe(true);
            (0, vitest_1.expect)(mockBroadcast).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.LOBBY_STATE, vitest_1.expect.any(Object));
        });
        (0, vitest_1.it)("allows unready toggle in lobby", () => {
            const client = mockClient("client-1");
            mockRoom.handleReady(client, { ready: true });
            mockRoom.handleReady(client, { ready: false });
            const player = mockRoom.state.players.get("client-1");
            (0, vitest_1.expect)(player?.ready).toBe(false);
        });
        (0, vitest_1.it)("rejects ready change when not in lobby", () => {
            mockRoom.state.phase = shared_1.GamePhase.Playing;
            const client = mockClient("client-1");
            mockRoom.handleReady(client, { ready: true });
            (0, vitest_1.expect)(client.send).toHaveBeenCalledWith(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Ready changes only allowed in lobby",
            });
        });
        (0, vitest_1.it)("calculates canStart correctly with minimum players and all ready", () => {
            const client1 = mockClient("client-1");
            const client2 = mockClient("client-2");
            const client3 = mockClient("client-3");
            const client4 = mockClient("client-4");
            mockRoom.handleJoin(client1, { name: "Player1" });
            mockRoom.handleJoin(client2, { name: "Player2" });
            mockRoom.handleJoin(client3, { name: "Player3" });
            mockRoom.handleJoin(client4, { name: "Player4" });
            // Not all ready - should not be able to start
            mockRoom.handleReady(client1, { ready: true });
            mockRoom.handleReady(client2, { ready: true });
            mockRoom.handleReady(client3, { ready: true });
            // client4 not ready
            const lobbyState = mockRoom.lobbySystem.getLobbyState();
            (0, vitest_1.expect)(lobbyState.canStart).toBe(false);
            // All ready - should be able to start
            mockRoom.handleReady(client4, { ready: true });
            const lobbyState2 = mockRoom.lobbySystem.getLobbyState();
            (0, vitest_1.expect)(lobbyState2.canStart).toBe(true);
        });
        (0, vitest_1.it)("requires minimum players to start", () => {
            const client1 = mockClient("client-1");
            const client2 = mockClient("client-2");
            const client3 = mockClient("client-3");
            mockRoom.handleJoin(client1, { name: "Player1" });
            mockRoom.handleJoin(client2, { name: "Player2" });
            mockRoom.handleJoin(client3, { name: "Player3" });
            mockRoom.handleReady(client1, { ready: true });
            mockRoom.handleReady(client2, { ready: true });
            mockRoom.handleReady(client3, { ready: true });
            const lobbyState = mockRoom.lobbySystem.getLobbyState();
            (0, vitest_1.expect)(lobbyState.canStart).toBe(false); // Only 3 players, need 4
        });
    });
});
(0, vitest_1.describe)("GameRoomState", () => {
    (0, vitest_1.it)("creates player with correct defaults", () => {
        const state = new GameRoomState_1.GameRoomState();
        const player = state.createPlayer("session-1", "account-1", "TestPlayer", "#FF0000");
        (0, vitest_1.expect)(player.sessionId).toBe("session-1");
        (0, vitest_1.expect)(player.accountId).toBe("account-1");
        (0, vitest_1.expect)(player.name).toBe("TestPlayer");
        (0, vitest_1.expect)(player.color).toBe("#FF0000");
        (0, vitest_1.expect)(player.x).toBe(960);
        (0, vitest_1.expect)(player.y).toBe(540);
        (0, vitest_1.expect)(player.state).toBe(shared_1.PlayerState.Alive);
        (0, vitest_1.expect)(Object.keys(player)).not.toContain("meetingsUsed");
        (0, vitest_1.expect)(Object.keys(player)).not.toContain("lastInputTimestamp");
        // Role is no longer in public state (private role assignment)
    });
});
