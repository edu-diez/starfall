import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameRoom } from "./GameRoom";
import { GameRoomState, Player } from "./schema/GameRoomState";
import { GamePhase, PlayerState, PlayerRole, Color } from "@starfall/shared";

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
    expect(client3.send).toHaveBeenCalledWith("error", { message: "Room is full" });
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