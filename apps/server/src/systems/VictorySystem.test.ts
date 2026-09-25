import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { VictorySystem } from "./VictorySystem";
import { RoleAssignmentSystem, DefaultRandomSource, RandomSource } from "./RoleAssignmentSystem";
import { PlayerRole, PlayerState, GamePhase } from "@starfall/shared";

/**
 * Deterministic random source for testing
 */
class TestRandomSource implements RandomSource {
  private values: number[];
  private index = 0;

  constructor(values: number[]) {
    // Use values directly as random outputs (should be in [0, 1) range)
    this.values = values;
  }

  random(): number {
    const value = this.values[this.index % this.values.length];
    this.index++;
    return value ?? 0;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      const temp = result[i];
      result[i] = result[j]!;
      result[j] = temp!;
    }
    return result;
  }
}

describe("VictorySystem", () => {
  let state: GameRoomState;
  let roleAssignmentSystem: RoleAssignmentSystem;
  let victorySystem: VictorySystem;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Playing;
    // Use a random source that keeps the first player as killer
    roleAssignmentSystem = new RoleAssignmentSystem(state, new TestRandomSource([0.99, 0.99, 0.99, 0.99]));
    victorySystem = new VictorySystem(state, roleAssignmentSystem);
  });

  const setupPlayers = (killerCount: number, crewmateCount: number, allAlive: boolean = true) => {
    let sessionId = 0;
    
    // Add killers
    for (let i = 0; i < killerCount; i++) {
      const player = new Player();
      player.sessionId = `killer-${sessionId}`;
      player.state = allAlive ? PlayerState.Alive : PlayerState.Dead;
      player.x = 100 + i * 50;
      player.y = 100;
      state.players.set(`killer-${sessionId}`, player);
      sessionId++;
    }
    
    // Add crewmates
    for (let i = 0; i < crewmateCount; i++) {
      const player = new Player();
      player.sessionId = `crewmate-${sessionId}`;
      player.state = allAlive ? PlayerState.Alive : PlayerState.Dead;
      player.x = 200 + i * 50;
      player.y = 200;
      state.players.set(`crewmate-${sessionId}`, player);
      sessionId++;
    }
    
    roleAssignmentSystem.assignRoles();
  };

  it("returns false when match not ended", () => {
    setupPlayers(1, 3);
    const result = victorySystem.evaluate();
    expect(result).toBe(false);
    expect(victorySystem.isMatchEnded()).toBe(false);
    expect(victorySystem.getWinner()).toBeNull();
  });

  it("detects Killer victory when living Killers >= living Crewmates", () => {
    // 1 killer, 1 crewmate alive = parity, killer wins
    setupPlayers(1, 1);
    const result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.isMatchEnded()).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Killer);
    expect(victorySystem.getEndReason()).toBe("Killer reached parity with Crewmates");
  });

  it("detects Killer victory when multiple killers >= crewmates", () => {
    // 2 killers, 1 crewmate = killer wins
    // Need to ensure both killers get the killer role
    // We'll manually set up players and assign roles
    state.players.clear();
    
    const killer1 = new Player();
    killer1.sessionId = "killer-1";
    killer1.state = PlayerState.Alive;
    killer1.x = 100;
    killer1.y = 100;
    state.players.set("killer-1", killer1);

    const killer2 = new Player();
    killer2.sessionId = "killer-2";
    killer2.state = PlayerState.Alive;
    killer2.x = 150;
    killer2.y = 100;
    state.players.set("killer-2", killer2);

    const crewmate1 = new Player();
    crewmate1.sessionId = "crewmate-1";
    crewmate1.state = PlayerState.Alive;
    crewmate1.x = 200;
    crewmate1.y = 200;
    state.players.set("crewmate-1", crewmate1);

    // Use a random source that makes both first players killers
    // This is tricky with the current system - let's just test with 1 killer
    // and verify the logic works
    roleAssignmentSystem.assignRoles();
    
    // Manually set both as killers for this test
    roleAssignmentSystem["roleMap"].set("killer-1", PlayerRole.Killer);
    roleAssignmentSystem["roleMap"].set("killer-2", PlayerRole.Killer);
    roleAssignmentSystem["roleMap"].set("crewmate-1", PlayerRole.Crewmate);

    const result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Killer);
  });

  it("detects Crewmate victory when no living killers", () => {
    // 1 killer dead, 3 crewmates alive = crewmates win
    setupPlayers(1, 3);
    // Kill the killer
    state.players.get("killer-0")!.state = PlayerState.Dead;
    const result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.isMatchEnded()).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Crewmate);
    expect(victorySystem.getEndReason()).toBe("All Killers eliminated");
  });

  it("does not end match when both sides have living players and no parity", () => {
    // 1 killer, 3 crewmates = no winner yet
    setupPlayers(1, 3);
    const result = victorySystem.evaluate();
    expect(result).toBe(false);
    expect(victorySystem.isMatchEnded()).toBe(false);
  });

  it("does not evaluate when not in playing phase", () => {
    state.phase = GamePhase.Lobby;
    setupPlayers(1, 1);
    const result = victorySystem.evaluate();
    expect(result).toBe(false);
    expect(victorySystem.isMatchEnded()).toBe(false);
  });

  it("does not evaluate when in meeting phase", () => {
    state.phase = GamePhase.Meeting;
    setupPlayers(1, 1);
    const result = victorySystem.evaluate();
    expect(result).toBe(false);
  });

  it("does not evaluate when in game over phase", () => {
    state.phase = GamePhase.GameOver;
    setupPlayers(1, 1);
    const result = victorySystem.evaluate();
    expect(result).toBe(false);
  });

  it("ignores dead players in victory calculation", () => {
    // 1 killer alive, 1 crewmate alive, 2 crewmates dead
    setupPlayers(1, 3);
    // Kill 2 crewmates
    state.players.get("crewmate-1")!.state = PlayerState.Dead;
    state.players.get("crewmate-2")!.state = PlayerState.Dead;
    
    const result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Killer);
  });

  it("ignores ejected players in victory calculation", () => {
    setupPlayers(1, 3);
    // Eject 2 crewmates
    state.players.get("crewmate-1")!.state = PlayerState.Ejected;
    state.players.get("crewmate-2")!.state = PlayerState.Ejected;
    
    const result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Killer);
  });

  it("reset clears winner and end reason", () => {
    setupPlayers(1, 1);
    victorySystem.evaluate();
    expect(victorySystem.isMatchEnded()).toBe(true);
    
    victorySystem.reset();
    expect(victorySystem.isMatchEnded()).toBe(false);
    expect(victorySystem.getWinner()).toBeNull();
    expect(victorySystem.getEndReason()).toBeNull();
  });

  it("forceEnd sets winner and reason", () => {
    victorySystem.forceEnd(PlayerRole.Crewmate, "Test reason");
    expect(victorySystem.isMatchEnded()).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Crewmate);
    expect(victorySystem.getEndReason()).toBe("Test reason");
  });

  it("correctly counts living players by role", () => {
    setupPlayers(1, 4);
    // Kill 2 crewmates
    state.players.get("crewmate-1")!.state = PlayerState.Dead;
    state.players.get("crewmate-2")!.state = PlayerState.Dead;
    
    // 1 killer, 2 crewmates alive = no winner
    let result = victorySystem.evaluate();
    expect(result).toBe(false);
    
    // Kill another crewmate
    state.players.get("crewmate-3")!.state = PlayerState.Dead;
    // 1 killer, 1 crewmate = killer wins
    result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Killer);
  });

  it("handles edge case: no living players", () => {
    setupPlayers(1, 1, false); // both dead
    const result = victorySystem.evaluate();
    expect(result).toBe(false); // No winner if no one alive
  });

  it("handles edge case: only dead killers and living crewmates", () => {
    // Set up 1 killer and 2 crewmates, all alive initially
    setupPlayers(1, 2, true);
    // Then kill the killer
    state.players.get("killer-0")!.state = PlayerState.Dead;
    const result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Crewmate);
  });

  it("handles edge case: only living killers and dead crewmates", () => {
    setupPlayers(1, 2);
    state.players.get("crewmate-1")!.state = PlayerState.Dead;
    state.players.get("crewmate-2")!.state = PlayerState.Dead;
    const result = victorySystem.evaluate();
    expect(result).toBe(true);
    expect(victorySystem.getWinner()).toBe(PlayerRole.Killer);
  });
});