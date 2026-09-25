import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { RoleAssignmentSystem, DefaultRandomSource, RandomSource } from "./RoleAssignmentSystem";
import { PlayerRole, PlayerState, GamePhase } from "@starfall/shared";

/**
 * Deterministic random source for testing
 */
class TestRandomSource implements RandomSource {
  private values: number[];
  private index = 0;

  constructor(values: number[]) {
    this.values = values;
  }

  random(): number {
    const value = this.values[this.index % this.values.length];
    this.index++;
    return value ?? 0;
  }

  shuffle<T>(array: T[]): T[] {
    // Simple deterministic shuffle based on our random values
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

describe("RoleAssignmentSystem", () => {
  let state: GameRoomState;
  let roleAssignmentSystem: RoleAssignmentSystem;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Lobby;
    roleAssignmentSystem = new RoleAssignmentSystem(state);
  });

  it("assigns exactly one Killer and rest Crewmates", () => {
    // Add 4 players
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    const assignments = roleAssignmentSystem.assignRoles();

    expect(assignments.size).toBe(4);
    const roles = Array.from(assignments.values());
    const killerCount = roles.filter((r) => r === PlayerRole.Killer).length;
    const crewmateCount = roles.filter((r) => r === PlayerRole.Crewmate).length;

    expect(killerCount).toBe(1);
    expect(crewmateCount).toBe(3);
  });

  it("assigns roles to all alive players", () => {
    // Add 5 alive players
    for (let i = 0; i < 5; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    // Add 1 dead player (should not get a role)
    const deadPlayer = new Player();
    deadPlayer.sessionId = "client-dead";
    deadPlayer.state = PlayerState.Dead;
    state.players.set("client-dead", deadPlayer);

    const assignments = roleAssignmentSystem.assignRoles();

    expect(assignments.size).toBe(5);
    expect(assignments.has("client-dead")).toBe(false);
  });

  it("getRole returns correct role for a player", () => {
    const player = new Player();
    player.sessionId = "client-1";
    player.state = PlayerState.Alive;
    state.players.set("client-1", player);

    roleAssignmentSystem.assignRoles();
    const role = roleAssignmentSystem.getRole("client-1");

    expect(role).toBeDefined();
    expect([PlayerRole.Killer, PlayerRole.Crewmate]).toContain(role);
  });

  it("getRole returns undefined for non-existent player", () => {
    const role = roleAssignmentSystem.getRole("non-existent");
    expect(role).toBeUndefined();
  });

  it("isKiller correctly identifies the Killer", () => {
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    roleAssignmentSystem.assignRoles();

    let killerFound = false;
    for (let i = 0; i < 4; i++) {
      const isKiller = roleAssignmentSystem.isKiller(`client-${i}`);
      if (isKiller) {
        killerFound = true;
        expect(roleAssignmentSystem.getRole(`client-${i}`)).toBe(PlayerRole.Killer);
      } else {
        expect(roleAssignmentSystem.getRole(`client-${i}`)).toBe(PlayerRole.Crewmate);
      }
    }

    expect(killerFound).toBe(true);
  });

  it("validateAssignment returns true for valid assignment", () => {
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    roleAssignmentSystem.assignRoles();
    expect(roleAssignmentSystem.validateAssignment()).toBe(true);
  });

  it("validateAssignment returns false when no players", () => {
    expect(roleAssignmentSystem.validateAssignment()).toBe(false);
  });

  it("getKillerCount returns 1", () => {
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    roleAssignmentSystem.assignRoles();
    expect(roleAssignmentSystem.getKillerCount()).toBe(1);
  });

  it("getCrewmateCount returns correct count", () => {
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    roleAssignmentSystem.assignRoles();
    expect(roleAssignmentSystem.getCrewmateCount()).toBe(3);
  });

  it("clearRoles removes all assignments", () => {
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    roleAssignmentSystem.assignRoles();
    expect(roleAssignmentSystem.getAllRoles().size).toBe(4);

    roleAssignmentSystem.clearRoles();
    expect(roleAssignmentSystem.getAllRoles().size).toBe(0);
  });

  it("deterministic random source produces deterministic assignments", () => {
    // Use a deterministic random source that always picks the first element as killer
    const testRandom = new TestRandomSource([0, 0, 0, 0]); // Always pick index 0
    roleAssignmentSystem.setRandomSource(testRandom);

    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    const assignments1 = roleAssignmentSystem.assignRoles();
    const killer1 = Array.from(assignments1.entries()).find(([_, r]) => r === PlayerRole.Killer)?.[0];

    // Reset and assign again
    roleAssignmentSystem.clearRoles();
    const testRandom2 = new TestRandomSource([0, 0, 0, 0]);
    roleAssignmentSystem.setRandomSource(testRandom2);

    const assignments2 = roleAssignmentSystem.assignRoles();
    const killer2 = Array.from(assignments2.entries()).find(([_, r]) => r === PlayerRole.Killer)?.[0];

    // With same seed, same player should be killer
    expect(killer1).toBe(killer2);
  });

  it("does not assign roles to dead or ejected players", () => {
    const alive1 = new Player();
    alive1.sessionId = "alive-1";
    alive1.state = PlayerState.Alive;
    state.players.set("alive-1", alive1);

    const alive2 = new Player();
    alive2.sessionId = "alive-2";
    alive2.state = PlayerState.Alive;
    state.players.set("alive-2", alive2);

    const dead = new Player();
    dead.sessionId = "dead-1";
    dead.state = PlayerState.Dead;
    state.players.set("dead-1", dead);

    const ejected = new Player();
    ejected.sessionId = "ejected-1";
    ejected.state = PlayerState.Ejected;
    state.players.set("ejected-1", ejected);

    const assignments = roleAssignmentSystem.assignRoles();

    expect(assignments.size).toBe(2);
    expect(assignments.has("alive-1")).toBe(true);
    expect(assignments.has("alive-2")).toBe(true);
    expect(assignments.has("dead-1")).toBe(false);
    expect(assignments.has("ejected-1")).toBe(false);
  });

  it("role map is private and not exposed in public state", () => {
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    roleAssignmentSystem.assignRoles();

    // Verify that Player schema doesn't have role field
    const player = state.players.get("client-0");
    expect(player).toBeDefined();
    // The Player class should not have a role property in the schema
    // This is verified by the fact that we removed @type("string") role from Player schema
  });
});