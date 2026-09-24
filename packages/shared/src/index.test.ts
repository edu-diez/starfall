import { describe, it, expect } from "vitest";
import { PlayerRole, PlayerState, GamePhase, GAME_CONFIG, COLORS, Vec2 } from "../src/index";

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
    expect(GamePhase.GameOver).toBe("gameover");
  });

  it("exports GAME_CONFIG constants", () => {
    expect(GAME_CONFIG.MAP_WIDTH).toBe(1920);
    expect(GAME_CONFIG.MAP_HEIGHT).toBe(1080);
    expect(GAME_CONFIG.MAX_PLAYERS).toBe(10);
    expect(GAME_CONFIG.MIN_PLAYERS).toBe(4);
  });

  it("exports COLORS array with 10 colors", () => {
    expect(COLORS.length).toBe(10);
    expect(COLORS[0]).toBe("#FF0000");
    expect(COLORS[9]).toBe("#8B4513");
  });

  it("Vec2 type works correctly", () => {
    const vec: Vec2 = { x: 10, y: 20 };
    expect(vec.x).toBe(10);
    expect(vec.y).toBe(20);
  });
});