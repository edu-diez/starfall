import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameRoom } from "./GameRoom";
import { GameRoomState, Player } from "./schema/GameRoomState";
import {
  GamePhase,
  PlayerState,
  PlayerRole,
  Color,
  GAME_CONFIG,
  Vec2,
  MESSAGE_TYPES,
} from "@starfall/shared";

// Mock Colyseus Room and Client
const mockClient = (sessionId: string) => ({
  sessionId,
  send: vi.fn(),
});

const mockBroadcast = vi.fn();

describe("GameRoom", () => {
  let room: GameRoom;
  let mockRoom: any;

  beforeEach(() => {
    room = new GameRoom();
    mockRoom = room as any;
    mockRoom.state = new GameRoomState();
    mockRoom.broadcast = mockBroadcast;
    mockBroadcast.mockClear();
  });

  it("initializes with Lobby phase", () => {
    mockRoom.onCreate({});
    expect(mockRoom.state.phase).toBe(GamePhase.Lobby);
  });

  it("creates a player on join message", () => {
    mockRoom.onCreate({});
    const client = mockClient("client-1");
    mockRoom.handleJoin(client, { name: "TestPlayer" });

    expect(mockRoom.state.players.size).toBe(1);
    const player = mockRoom.state.players.get("client-1");
    expect(player).toBeDefined();
    expect(player?.name).toBe("TestPlayer");
    expect(player?.sessionId).toBe("client-1");
    expect(player?.state).toBe(PlayerState.Alive);
    // Role is no longer in public state (private role assignment)
  });

  it("assigns unique colors to players", () => {
    mockRoom.onCreate({});
    const client1 = mockClient("client-1");
    const client2 = mockClient("client-2");

    mockRoom.handleJoin(client1, { name: "Player1" });
    mockRoom.handleJoin(client2, { name: "Player2" });

    const player1 = mockRoom.state.players.get("client-1");
    const player2 = mockRoom.state.players.get("client-2");

    expect(player1?.color).not.toBe(player2?.color);
  });

  it("removes player on leave", () => {
    mockRoom.onCreate({});
    const client = mockClient("client-1");
    mockRoom.handleJoin(client, { name: "TestPlayer" });
    expect(mockRoom.state.players.size).toBe(1);

    mockRoom.handleLeave(client);
    expect(mockRoom.state.players.size).toBe(0);
  });

  it("rejects join when room is full", () => {
    mockRoom.onCreate({});
    // Use the actual max players from config (10)
    // Fill up to max players
    for (let i = 1; i <= GAME_CONFIG.MAX_PLAYERS; i++) {
      const client = mockClient(`client-${i}`);
      mockRoom.handleJoin(client, { name: `Player${i}` });
    }

    // Try to add one more
    const extraClient = mockClient("client-extra");
    mockRoom.handleJoin(extraClient, { name: "ExtraPlayer" });

    expect(mockRoom.state.players.size).toBe(GAME_CONFIG.MAX_PLAYERS);
    expect(extraClient.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
      message: "Cannot join at this time",
    });
  });

  // Movement tests
  describe("Movement System", () => {
    beforeEach(() => {
      mockRoom.onCreate({});

      const client = mockClient("client-1");
      mockRoom.handleJoin(client, { name: "TestPlayer" });

      // Set phase to Playing for movement tests
      mockRoom.state.phase = GamePhase.Playing;
    });

    it("stores validated movement input", () => {
      const client = mockClient("client-1");
      const direction: Vec2 = { x: 1, y: 0 };

      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      const storedInput = mockRoom.playerInputs.get("client-1");
      expect(storedInput).toBeDefined();
      expect(storedInput?.direction.x).toBe(1);
      expect(storedInput?.direction.y).toBe(0);
    });

    it("rejects non-finite input", () => {
      const client = mockClient("client-1");

      // Test NaN
      mockRoom.handleMove(client, {
        direction: { x: NaN, y: 0 },
        timestamp: Date.now(),
      });
      expect(mockRoom.playerInputs.has("client-1")).toBe(false);

      // Test Infinity
      mockRoom.handleMove(client, {
        direction: { x: Infinity, y: 0 },
        timestamp: Date.now(),
      });
      expect(mockRoom.playerInputs.has("client-1")).toBe(false);

      // Test non-finite timestamp
      mockRoom.handleMove(client, {
        direction: { x: 1, y: 0 },
        timestamp: NaN,
      });
      expect(mockRoom.playerInputs.has("client-1")).toBe(false);
    });

    it("normalizes diagonal input to unit vector", () => {
      const client = mockClient("client-1");
      // Diagonal input with magnitude > 1
      const direction: Vec2 = { x: 1, y: 1 };

      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      const storedInput = mockRoom.playerInputs.get("client-1");
      expect(storedInput).toBeDefined();
      // Should be normalized to unit vector
      const magnitude = Math.sqrt(
        storedInput!.direction.x ** 2 + storedInput!.direction.y ** 2,
      );
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it("does not accept movement from unknown player", () => {
      const client = mockClient("unknown-client");
      const direction: Vec2 = { x: 1, y: 0 };

      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      expect(mockRoom.playerInputs.has("unknown-client")).toBe(false);
    });

    it("does not accept movement from dead player", () => {
      const client = mockClient("client-1");
      const player = mockRoom.state.players.get("client-1");
      if (player) {
        player.state = PlayerState.Dead;
      }

      const direction: Vec2 = { x: 1, y: 0 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      expect(mockRoom.playerInputs.has("client-1")).toBe(false);
    });

    it("applies world boundaries during tick", () => {
      const client = mockClient("client-1");
      const player = mockRoom.state.players.get("client-1");

      // Place player at left edge
      if (player) {
        player.x = GAME_CONFIG.PLAYER_RADIUS;
        player.y = GAME_CONFIG.MAP_HEIGHT / 2;
      }

      // Try to move left (outside boundary)
      const direction: Vec2 = { x: -1, y: 0 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      // Simulate a tick with deltaTime = 1 second
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();

      // Player should not go past left boundary
      expect(player?.x).toBeGreaterThanOrEqual(GAME_CONFIG.PLAYER_RADIUS);
    });

    it("applies right boundary during tick", () => {
      const client = mockClient("client-1");
      const player = mockRoom.state.players.get("client-1");

      // Place player at right edge
      if (player) {
        player.x = GAME_CONFIG.MAP_WIDTH - GAME_CONFIG.PLAYER_RADIUS;
        player.y = GAME_CONFIG.MAP_HEIGHT / 2;
      }

      // Try to move right (outside boundary)
      const direction: Vec2 = { x: 1, y: 0 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      // Simulate a tick with deltaTime = 1 second
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();

      // Player should not go past right boundary
      expect(player?.x).toBeLessThanOrEqual(
        GAME_CONFIG.MAP_WIDTH - GAME_CONFIG.PLAYER_RADIUS,
      );
    });

    it("applies top boundary during tick", () => {
      const client = mockClient("client-1");
      const player = mockRoom.state.players.get("client-1");

      // Place player at top edge
      if (player) {
        player.x = GAME_CONFIG.MAP_WIDTH / 2;
        player.y = GAME_CONFIG.PLAYER_RADIUS;
      }

      // Try to move up (outside boundary)
      const direction: Vec2 = { x: 0, y: -1 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      // Simulate a tick with deltaTime = 1 second
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();

      // Player should not go past top boundary
      expect(player?.y).toBeGreaterThanOrEqual(GAME_CONFIG.PLAYER_RADIUS);
    });

    it("applies bottom boundary during tick", () => {
      const client = mockClient("client-1");
      const player = mockRoom.state.players.get("client-1");

      // Place player at bottom edge
      if (player) {
        player.x = GAME_CONFIG.MAP_WIDTH / 2;
        player.y = GAME_CONFIG.MAP_HEIGHT - GAME_CONFIG.PLAYER_RADIUS;
      }

      // Try to move down (outside boundary)
      const direction: Vec2 = { x: 0, y: 1 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      // Simulate a tick with deltaTime = 1 second
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();

      // Player should not go past bottom boundary
      expect(player?.y).toBeLessThanOrEqual(
        GAME_CONFIG.MAP_HEIGHT - GAME_CONFIG.PLAYER_RADIUS,
      );
    });

    it("movement distance is determined by server time and speed", () => {
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
      const direction: Vec2 = { x: 1, y: 0 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      // Simulate a tick with deltaTime = 1 second
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();

      // Player should move exactly PLAYER_SPEED pixels in 1 second
      const expectedX = 850 + GAME_CONFIG.PLAYER_SPEED;
      expect(player?.x).toBeCloseTo(expectedX, 0);
    });

    it("does not simulate movement in Lobby phase", () => {
      const client = mockClient("client-1");
      const player = mockRoom.state.players.get("client-1");

      if (player) {
        player.x = GAME_CONFIG.MAP_WIDTH / 2;
        player.y = GAME_CONFIG.MAP_HEIGHT / 2;
      }

      // Set phase to Lobby
      mockRoom.state.phase = GamePhase.Lobby;

      const direction: Vec2 = { x: 1, y: 0 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      // Simulate a tick
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();

      // Player should not move in Lobby phase
      expect(player?.x).toBe(GAME_CONFIG.MAP_WIDTH / 2);
    });

    it("clears player input on leave", () => {
      const client = mockClient("client-1");
      const direction: Vec2 = { x: 1, y: 0 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      expect(mockRoom.playerInputs.has("client-1")).toBe(true);

      mockRoom.handleLeave(client);

      expect(mockRoom.playerInputs.has("client-1")).toBe(false);
    });

    it("blocks cached and new movement while a player is venting", () => {
      const client = mockClient("client-1");
      const player = mockRoom.state.players.get("client-1")!;
      player.x = 960;
      player.y = 150;
      mockRoom.roleAssignmentSystem["roleMap"].set("client-1", PlayerRole.Killer);
      mockRoom.handleMove(client, { direction: { x: 1, y: 0 }, timestamp: Date.now() });
      mockRoom.handleVentEnter(client, { nodeId: "vent-bridge" });

      expect(mockRoom.ventSystem.isVenting("client-1")).toBe(true);
      expect(mockRoom.playerInputs.has("client-1")).toBe(false);
      mockRoom.handleMove(client, { direction: { x: 1, y: 0 }, timestamp: Date.now() });
      expect(mockRoom.playerInputs.has("client-1")).toBe(false);

      const positionBeforeTick = { x: player.x, y: player.y };
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();
      expect(player).toMatchObject(positionBeforeTick);
    });
  });

  // Lobby and Color System tests
  describe("Vent System", () => {
    beforeEach(() => {
      mockRoom.onCreate({});
      const client = mockClient("client-1");
      mockRoom.handleJoin(client, { name: "Killer" });
      mockRoom.state.phase = GamePhase.Playing;
      const player = mockRoom.state.players.get("client-1")!;
      player.x = 960;
      player.y = 150;
      mockRoom.roleAssignmentSystem["roleMap"].set("client-1", PlayerRole.Killer);
    });

    it("rejects malformed vent payloads before mutation", () => {
      const client = mockClient("client-1");
      mockRoom.handleVentEnter(client, {});

      expect(mockRoom.ventSystem.isVenting("client-1")).toBe(false);
      expect(client.send).toHaveBeenCalledWith(MESSAGE_TYPES.VENT_STATE, expect.objectContaining({
        success: false,
        reason: "Vent node must be a string",
      }));
    });

    it("cleans vent state when a meeting begins", () => {
      const client = mockClient("client-1");
      mockRoom.handleVentEnter(client, { nodeId: "vent-bridge" });
      expect(mockRoom.ventSystem.isVenting("client-1")).toBe(true);

      mockRoom.handleCallMeeting(client, {});

      expect(mockRoom.ventSystem.isVenting("client-1")).toBe(false);
      expect(mockRoom.state.phase).toBe(GamePhase.Meeting);
    });

    it("cleans vent state when a player leaves", () => {
      const client = mockClient("client-1");
      mockRoom.handleVentEnter(client, { nodeId: "vent-bridge" });
      mockRoom.handleLeave(client);

      expect(mockRoom.ventSystem.isVenting("client-1")).toBe(false);
    });
  });

  describe("Lobby System", () => {
    beforeEach(() => {
      mockRoom.onCreate({});
      const client = mockClient("client-1");
      mockRoom.handleJoin(client, { name: "TestPlayer" });
    });

    it("initializes with Lobby phase", () => {
      expect(mockRoom.state.phase).toBe(GamePhase.Lobby);
    });

    it("assigns unique colors to joining players", () => {
      const client1 = mockClient("client-1");
      const client2 = mockClient("client-2");
      const client3 = mockClient("client-3");

      mockRoom.handleJoin(client1, { name: "Player1" });
      mockRoom.handleJoin(client2, { name: "Player2" });
      mockRoom.handleJoin(client3, { name: "Player3" });

      const colors = new Set<string>();
      mockRoom.state.players.forEach((player: any) => colors.add(player.color));
      expect(colors.size).toBe(3);
    });

    it("rejects join when not in lobby phase", () => {
      mockRoom.state.phase = GamePhase.Playing;
      const client = mockClient("client-new");
      mockRoom.handleJoin(client, { name: "NewPlayer" });

      expect(mockRoom.state.players.size).toBe(1); // Original player only
      expect(client.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
        message: "Cannot join at this time",
      });
    });

    it("rejects join when room is full", () => {
      // Fill up to max players
      for (let i = 1; i <= GAME_CONFIG.MAX_PLAYERS; i++) {
        const client = mockClient(`client-${i}`);
        mockRoom.handleJoin(client, { name: `Player${i}` });
      }

      // Try to add one more
      const extraClient = mockClient("client-extra");
      mockRoom.handleJoin(extraClient, { name: "ExtraPlayer" });

      expect(mockRoom.state.players.size).toBe(GAME_CONFIG.MAX_PLAYERS);
      expect(extraClient.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
        message: "Cannot join at this time",
      });
    });

    it("releases color when player leaves", () => {
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
      expect(color3).toBe(color1); // Should get the released color
    });
  });

  describe("Color System", () => {
    beforeEach(() => {
      mockRoom.onCreate({});
      const client = mockClient("client-1");
      mockRoom.handleJoin(client, { name: "TestPlayer" });
    });

    it("allows color change to available color in lobby", () => {
      const client = mockClient("client-1");
      const newColor = "#0000FF"; // Blue

      mockRoom.handleColorChange(client, { color: newColor });

      const player = mockRoom.state.players.get("client-1");
      expect(player?.color).toBe(newColor);
      expect(mockBroadcast).toHaveBeenCalledWith(MESSAGE_TYPES.COLOR_CHANGE, {
        sessionId: "client-1",
        color: newColor,
      });
    });

    it("rejects color change to already taken color", () => {
      const client1 = mockClient("client-1");
      const client2 = mockClient("client-2");

      mockRoom.handleJoin(client1, { name: "Player1" });
      mockRoom.handleJoin(client2, { name: "Player2" });

      const color1 = mockRoom.state.players.get("client-1")?.color;

      // Try to change client2's color to client1's color
      mockRoom.handleColorChange(client2, { color: color1! });

      const player2 = mockRoom.state.players.get("client-2");
      expect(player2?.color).not.toBe(color1);
      expect(client2.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
        message: "Color already in use",
      });
    });

    it("rejects color change to unknown color", () => {
      const client = mockClient("client-1");
      const unknownColor = "#123456"; // Not in COLORS

      mockRoom.handleColorChange(client, { color: unknownColor as any });

      expect(client.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
        message: "Unknown color",
      });
    });

    it("rejects color change when not in lobby", () => {
      mockRoom.state.phase = GamePhase.Playing;
      const client = mockClient("client-1");
      const newColor = "#0000FF";

      mockRoom.handleColorChange(client, { color: newColor });

      expect(client.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
        message: "Color changes only allowed in lobby",
      });
    });
  });

  describe("Ready System", () => {
    beforeEach(() => {
      mockRoom.onCreate({});
      const client = mockClient("client-1");
      mockRoom.handleJoin(client, { name: "TestPlayer" });
    });

    it("allows ready toggle in lobby", () => {
      const client = mockClient("client-1");

      mockRoom.handleReady(client, { ready: true });

      const player = mockRoom.state.players.get("client-1");
      expect(player?.ready).toBe(true);
      expect(mockBroadcast).toHaveBeenCalledWith(
        MESSAGE_TYPES.LOBBY_STATE,
        expect.any(Object),
      );
    });

    it("allows unready toggle in lobby", () => {
      const client = mockClient("client-1");

      mockRoom.handleReady(client, { ready: true });
      mockRoom.handleReady(client, { ready: false });

      const player = mockRoom.state.players.get("client-1");
      expect(player?.ready).toBe(false);
    });

    it("rejects ready change when not in lobby", () => {
      mockRoom.state.phase = GamePhase.Playing;
      const client = mockClient("client-1");

      mockRoom.handleReady(client, { ready: true });

      expect(client.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
        message: "Ready changes only allowed in lobby",
      });
    });

    it("calculates canStart correctly with minimum players and all ready", () => {
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
      expect(lobbyState.canStart).toBe(false);

      // All ready - should be able to start
      mockRoom.handleReady(client4, { ready: true });

      const lobbyState2 = mockRoom.lobbySystem.getLobbyState();
      expect(lobbyState2.canStart).toBe(true);
    });

    it("requires minimum players to start", () => {
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
      expect(lobbyState.canStart).toBe(false); // Only 3 players, need 4
    });
  });
});

describe("GameRoomState", () => {
  it("creates player with correct defaults", () => {
    const state = new GameRoomState();
    const player = state.createPlayer("session-1", "TestPlayer", "#FF0000");

    expect(player.sessionId).toBe("session-1");
    expect(player.name).toBe("TestPlayer");
    expect(player.color).toBe("#FF0000");
    expect(player.x).toBe(960);
    expect(player.y).toBe(540);
    expect(player.state).toBe(PlayerState.Alive);
    // Role is no longer in public state (private role assignment)
  });
});
