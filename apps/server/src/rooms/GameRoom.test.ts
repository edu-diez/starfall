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
    expect(player?.role).toBe(PlayerRole.Crewmate);
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
    mockRoom.maxClients = 2;

    const client1 = mockClient("client-1");
    const client2 = mockClient("client-2");
    const client3 = mockClient("client-3");

    mockRoom.handleJoin(client1, { name: "Player1" });
    mockRoom.handleJoin(client2, { name: "Player2" });
    mockRoom.handleJoin(client3, { name: "Player3" });

    expect(mockRoom.state.players.size).toBe(2);
    expect(client3.send).toHaveBeenCalledWith(MESSAGE_TYPES.ERROR, {
      message: "Room is full",
    });
  });

  // Movement tests
  describe("Movement System", () => {
    beforeEach(() => {
      mockRoom.onCreate({});
      // Set phase to Playing for movement tests
      mockRoom.state.phase = GamePhase.Playing;

      const client = mockClient("client-1");
      mockRoom.handleJoin(client, { name: "TestPlayer" });
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

      if (player) {
        player.x = GAME_CONFIG.MAP_WIDTH / 2;
        player.y = GAME_CONFIG.MAP_HEIGHT / 2;
      }

      // Move right at full speed
      const direction: Vec2 = { x: 1, y: 0 };
      mockRoom.handleMove(client, { direction, timestamp: Date.now() });

      // Simulate a tick with deltaTime = 1 second
      mockRoom.lastTickTime = Date.now() - 1000;
      mockRoom.tick();

      // Player should move exactly PLAYER_SPEED pixels in 1 second
      const expectedX = GAME_CONFIG.MAP_WIDTH / 2 + GAME_CONFIG.PLAYER_SPEED;
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
    expect(player.role).toBe(PlayerRole.Crewmate);
    expect(player.state).toBe(PlayerState.Alive);
  });
});
