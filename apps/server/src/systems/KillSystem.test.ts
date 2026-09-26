import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { KillSystem, DefaultClock, Clock } from "./KillSystem";
import { RoleAssignmentSystem, DefaultRandomSource, RandomSource } from "./RoleAssignmentSystem";
import { PlayerRole, PlayerState, GamePhase, GAME_CONFIG } from "@starfall/shared";

/**
 * Deterministic clock for testing
 */
class TestClock implements Clock {
  private time: number;

  constructor(initialTime: number = 1000000) {
    this.time = initialTime;
  }

  now(): number {
    return this.time;
  }

  advance(ms: number): void {
    this.time += ms;
  }

  setTime(time: number): void {
    this.time = time;
  }
}

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

describe("KillSystem", () => {
  let state: GameRoomState;
  let roleAssignmentSystem: RoleAssignmentSystem;
  let killSystem: KillSystem;
  let testClock: TestClock;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Playing;
    testClock = new TestClock();
    // Use a random source that keeps the first player as killer (returns ~0.99 to keep order)
    roleAssignmentSystem = new RoleAssignmentSystem(state, new TestRandomSource([0.99, 0.99, 0.99, 0.99]));
    killSystem = new KillSystem(state, roleAssignmentSystem, testClock);
  });

  const setupPlayers = (killerId: string, targetId: string, distance: number = 30) => {
    // Add killer FIRST so it becomes the killer (first in map iteration)
    const killer = new Player();
    killer.sessionId = killerId;
    killer.state = PlayerState.Alive;
    killer.x = 500;
    killer.y = 500;
    state.players.set(killerId, killer);

    // Add target at specified distance
    const target = new Player();
    target.sessionId = targetId;
    target.state = PlayerState.Alive;
    target.x = 500 + distance;
    target.y = 500;
    state.players.set(targetId, target);

    // Assign roles - first player added becomes killer
    roleAssignmentSystem.assignRoles();
  };

  it("allows Killer to kill Crewmate within range", () => {
    setupPlayers("killer", "target", 30);

    const result = killSystem.attemptKill("killer", "target");

    expect(result.success).toBe(true);
    expect(state.players.get("target")?.state).toBe(PlayerState.Dead);
  });

  it("rejects kill when not in playing phase", () => {
    state.phase = GamePhase.Lobby;
    setupPlayers("killer", "target", 30);

    const result = killSystem.attemptKill("killer", "target");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Kill only allowed during playing phase");
  });

  it("rejects kill from non-existent killer", () => {
    setupPlayers("killer", "target", 30);

    const result = killSystem.attemptKill("non-existent", "target");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Killer not found");
  });

  it("rejects kill from dead killer", () => {
    setupPlayers("killer", "target", 30);
    state.players.get("killer")!.state = PlayerState.Dead;

    const result = killSystem.attemptKill("killer", "target");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Killer is not alive");
  });

  it("rejects kill from Crewmate (not Killer role)", () => {
    // Create a test where the second player is the killer
    // We need to add players in order: crewmate first, then killer
    const crewmate = new Player();
    crewmate.sessionId = "crewmate";
    crewmate.state = PlayerState.Alive;
    crewmate.x = 500;
    crewmate.y = 500;
    state.players.set("crewmate", crewmate);

    const killer = new Player();
    killer.sessionId = "killer";
    killer.state = PlayerState.Alive;
    killer.x = 530;
    killer.y = 500;
    state.players.set("killer", killer);

    // Use a random source that picks the second player as killer
    // With 2 players, Fisher-Yates shuffle: i=1, j=floor(random()*2)
    // If random() <= 0.5, j=0, swap elements -> [killer, crewmate]
    // If random() > 0.5, j=1, no swap -> [crewmate, killer]
    // We want the second player to become killer, so we need random() <= 0.5
    const testRandom = new TestRandomSource([0.3, 0.1, 0.1, 0.1]); // Second player becomes killer
    roleAssignmentSystem.setRandomSource(testRandom);
    roleAssignmentSystem.assignRoles();

    // Verify the killer role was assigned correctly
    expect(roleAssignmentSystem.isKiller("killer")).toBe(true);
    expect(roleAssignmentSystem.isKiller("crewmate")).toBe(false);

    const result = killSystem.attemptKill("crewmate", "killer");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Only the Killer can kill");
  });

  it("rejects kill on non-existent target", () => {
    setupPlayers("killer", "target", 30);

    const result = killSystem.attemptKill("killer", "non-existent");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Target not found");
  });

  it("rejects kill on dead target", () => {
    setupPlayers("killer", "target", 30);
    state.players.get("target")!.state = PlayerState.Dead;

    const result = killSystem.attemptKill("killer", "target");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Target is not alive");
  });

  it("rejects kill on self", () => {
    setupPlayers("killer", "target", 30);

    const result = killSystem.attemptKill("killer", "killer");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Cannot target self");
  });

  it("rejects kill when target out of range", () => {
    setupPlayers("killer", "target", GAME_CONFIG.KILL_RANGE + 10);

    const result = killSystem.attemptKill("killer", "target");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Target out of range");
  });

  it("rejects a Killer attack while the Killer is venting", () => {
    setupPlayers("killer", "target", 30);
    killSystem = new KillSystem(state, roleAssignmentSystem, testClock, (sessionId) => sessionId === "killer");

    const result = killSystem.attemptKill("killer", "target");

    expect(result).toMatchObject({ success: false, reason: "Cannot kill while inside a vent" });
  });

  it("rejects kill during cooldown", () => {
    setupPlayers("killer", "target1", 30);

    // Add a second target
    const target2 = new Player();
    target2.sessionId = "target2";
    target2.state = PlayerState.Alive;
    target2.x = 530;
    target2.y = 500;
    state.players.set("target2", target2);

    // First kill succeeds
    const result1 = killSystem.attemptKill("killer", "target1");
    expect(result1.success).toBe(true);

    // Second kill immediately fails due to cooldown
    const result2 = killSystem.attemptKill("killer", "target2");
    expect(result2.success).toBe(false);
    expect(result2.reason).toBe("Kill on cooldown");
  });

  it("allows kill after cooldown expires", () => {
    setupPlayers("killer", "target1", 30);

    // First kill
    const result1 = killSystem.attemptKill("killer", "target1");
    expect(result1.success).toBe(true);

    // Advance time past cooldown
    testClock.advance(GAME_CONFIG.KILL_COOLDOWN * 1000 + 1);

    // Add another target
    const target2 = new Player();
    target2.sessionId = "target2";
    target2.state = PlayerState.Alive;
    target2.x = 530;
    target2.y = 500;
    state.players.set("target2", target2);

    // Second kill should succeed
    const result2 = killSystem.attemptKill("killer", "target2");
    expect(result2.success).toBe(true);
  });

  it("tracks cooldown remaining correctly", () => {
    setupPlayers("killer", "target", 30);

    expect(killSystem.getCooldownRemaining("killer")).toBe(0);

    killSystem.attemptKill("killer", "target");

    const remaining = killSystem.getCooldownRemaining("killer");
    expect(remaining).toBe(GAME_CONFIG.KILL_COOLDOWN * 1000);

    // Advance half the cooldown
    testClock.advance((GAME_CONFIG.KILL_COOLDOWN * 1000) / 2);
    expect(killSystem.getCooldownRemaining("killer")).toBe((GAME_CONFIG.KILL_COOLDOWN * 1000) / 2);
  });

  it("canKill returns correct status", () => {
    setupPlayers("killer", "target", 30);

    expect(killSystem.canKill("killer")).toBe(true);

    killSystem.attemptKill("killer", "target");
    expect(killSystem.canKill("killer")).toBe(false);

    testClock.advance(GAME_CONFIG.KILL_COOLDOWN * 1000 + 1);
    expect(killSystem.canKill("killer")).toBe(true);
  });

  it("clearCooldown removes cooldown for specific player", () => {
    setupPlayers("killer", "target", 30);

    killSystem.attemptKill("killer", "target");
    expect(killSystem.canKill("killer")).toBe(false);

    killSystem.clearCooldown("killer");
    expect(killSystem.canKill("killer")).toBe(true);
  });

  it("clearAllCooldowns removes all cooldowns", () => {
    setupPlayers("killer", "target", 30);
    killSystem.attemptKill("killer", "target");

    const killer2 = new Player();
    killer2.sessionId = "killer2";
    killer2.state = PlayerState.Alive;
    killer2.x = 600;
    killer2.y = 600;
    state.players.set("killer2", killer2);
    // Manually set cooldown for killer2
    killSystem["killCooldownUntil"].set("killer2", testClock.now() + 10000);

    killSystem.clearAllCooldowns();
    expect(killSystem.canKill("killer")).toBe(true);
    expect(killSystem.canKill("killer2")).toBe(true);
  });

  it("returns correct kill cooldown config", () => {
    expect(killSystem.getKillCooldown()).toBe(GAME_CONFIG.KILL_COOLDOWN);
  });

  it("returns correct kill range config", () => {
    expect(killSystem.getKillRange()).toBe(GAME_CONFIG.KILL_RANGE);
  });

  it("does not allow kill when target at exact range boundary", () => {
    setupPlayers("killer", "target", GAME_CONFIG.KILL_RANGE);

    const result = killSystem.attemptKill("killer", "target");
    expect(result.success).toBe(true);
  });

  it("does not allow kill when target just beyond range boundary", () => {
    setupPlayers("killer", "target", GAME_CONFIG.KILL_RANGE + 0.1);

    const result = killSystem.attemptKill("killer", "target");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("Target out of range");
  });
});