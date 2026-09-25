import { describe, it, expect } from "vitest";
import {
  PlayerRole,
  PlayerState,
  GamePhase,
  GAME_CONFIG,
  COLORS,
  Vec2,
  MESSAGE_TYPES,
  MoveMessage,
  JoinMessage,
  WelcomeMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  ErrorMessage,
} from "../src/index";

describe("Shared package", () => {
  it("exports PlayerRole enum", () => {
    expect(PlayerRole.Crewmate).toBe("crewmate");
    expect(PlayerRole.Killer).toBe("killer");
  });

  it("exports PlayerState enum", () => {
    expect(PlayerState.Alive).toBe("alive");
    expect(PlayerState.Dead).toBe("dead");
    expect(PlayerState.Ejected).toBe("ejected");
  });

  it("exports GamePhase enum", () => {
    expect(GamePhase.Lobby).toBe("lobby");
    expect(GamePhase.Playing).toBe("playing");
    expect(GamePhase.Meeting).toBe("meeting");
    expect(GamePhase.Voting).toBe("voting");
    expect(GamePhase.ResolvingVote).toBe("resolvingVote");
    expect(GamePhase.GameOver).toBe("gameover");
  });

  it("exports GAME_CONFIG constants", () => {
    expect(GAME_CONFIG.MAP_WIDTH).toBe(1920);
    expect(GAME_CONFIG.MAP_HEIGHT).toBe(1080);
    expect(GAME_CONFIG.MAX_PLAYERS).toBe(10);
    expect(GAME_CONFIG.MIN_PLAYERS).toBe(4);
  });

  it("exports COLORS array with 21 colors", () => {
    expect(COLORS.length).toBe(21);
    expect(COLORS[0]).toBe("#FF0000");
    expect(COLORS[20]).toBe("#DA70D6");
  });

  it("Vec2 type works correctly", () => {
    const vec: Vec2 = { x: 10, y: 20 };
    expect(vec.x).toBe(10);
    expect(vec.y).toBe(20);
  });

  it("exports MESSAGE_TYPES constants", () => {
    expect(MESSAGE_TYPES.JOIN).toBe("join");
    expect(MESSAGE_TYPES.LEAVE).toBe("leave");
    expect(MESSAGE_TYPES.MOVE).toBe("move");
    expect(MESSAGE_TYPES.WELCOME).toBe("welcome");
    expect(MESSAGE_TYPES.PLAYER_JOINED).toBe("playerJoined");
    expect(MESSAGE_TYPES.PLAYER_LEFT).toBe("playerLeft");
    expect(MESSAGE_TYPES.ERROR).toBe("error");
    expect(MESSAGE_TYPES.VOTE).toBe("vote");
    expect(MESSAGE_TYPES.VOTING_RESULTS).toBe("votingResults");
  });

  it("MoveMessage type works correctly", () => {
    const msg: MoveMessage = {
      direction: { x: 1, y: 0 },
      timestamp: Date.now(),
    };
    expect(msg.direction.x).toBe(1);
    expect(msg.direction.y).toBe(0);
    expect(typeof msg.timestamp).toBe("number");
  });

  it("JoinMessage type works correctly", () => {
    const msg: JoinMessage = { name: "TestPlayer" };
    expect(msg.name).toBe("TestPlayer");
  });

  it("WelcomeMessage type works correctly", () => {
    const msg: WelcomeMessage = {
      sessionId: "session-1",
      playerId: "player-1",
      color: "#FF0000",
      phase: GamePhase.Lobby,
    };
    expect(msg.sessionId).toBe("session-1");
    expect(msg.color).toBe("#FF0000");
    expect(msg.phase).toBe(GamePhase.Lobby);
  });

  it("PlayerJoinedMessage type works correctly", () => {
    const msg: PlayerJoinedMessage = {
      sessionId: "session-1",
      name: "TestPlayer",
      color: "#FF0000",
    };
    expect(msg.name).toBe("TestPlayer");
  });

  it("PlayerLeftMessage type works correctly", () => {
    const msg: PlayerLeftMessage = { sessionId: "session-1" };
    expect(msg.sessionId).toBe("session-1");
  });

  it("ErrorMessage type works correctly", () => {
    const msg: ErrorMessage = { message: "Room is full" };
    expect(msg.message).toBe("Room is full");
  });
});
