"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const KillSystem_1 = require("./KillSystem");
const RoleAssignmentSystem_1 = require("./RoleAssignmentSystem");
const shared_1 = require("@starfall/shared");
/**
 * Deterministic clock for testing
 */
class TestClock {
    constructor(initialTime = 1000000) {
        this.time = initialTime;
    }
    now() {
        return this.time;
    }
    advance(ms) {
        this.time += ms;
    }
    setTime(time) {
        this.time = time;
    }
}
/**
 * Deterministic random source for testing
 */
class TestRandomSource {
    constructor(values) {
        this.index = 0;
        // Use values directly as random outputs (should be in [0, 1) range)
        this.values = values;
    }
    random() {
        const value = this.values[this.index % this.values.length];
        this.index++;
        return value ?? 0;
    }
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            const temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }
        return result;
    }
}
(0, vitest_1.describe)("KillSystem", () => {
    let state;
    let roleAssignmentSystem;
    let killSystem;
    let testClock;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Playing;
        testClock = new TestClock();
        // Use a random source that keeps the first player as killer (returns ~0.99 to keep order)
        roleAssignmentSystem = new RoleAssignmentSystem_1.RoleAssignmentSystem(state, new TestRandomSource([0.99, 0.99, 0.99, 0.99]));
        killSystem = new KillSystem_1.KillSystem(state, roleAssignmentSystem, testClock);
    });
    const setupPlayers = (killerId, targetId, distance = 30) => {
        // Add killer FIRST so it becomes the killer (first in map iteration)
        const killer = new GameRoomState_1.Player();
        killer.sessionId = killerId;
        killer.state = shared_1.PlayerState.Alive;
        killer.x = 500;
        killer.y = 500;
        state.players.set(killerId, killer);
        // Add target at specified distance
        const target = new GameRoomState_1.Player();
        target.sessionId = targetId;
        target.state = shared_1.PlayerState.Alive;
        target.x = 500 + distance;
        target.y = 500;
        state.players.set(targetId, target);
        // Assign roles - first player added becomes killer
        roleAssignmentSystem.assignRoles();
    };
    (0, vitest_1.it)("allows Killer to kill Crewmate within range", () => {
        setupPlayers("killer", "target", 30);
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(state.players.get("target")?.state).toBe(shared_1.PlayerState.Dead);
    });
    (0, vitest_1.it)("rejects kill when not in playing phase", () => {
        state.phase = shared_1.GamePhase.Lobby;
        setupPlayers("killer", "target", 30);
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Kill only allowed during playing phase");
    });
    (0, vitest_1.it)("rejects kill from non-existent killer", () => {
        setupPlayers("killer", "target", 30);
        const result = killSystem.attemptKill("non-existent", "target");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Killer not found");
    });
    (0, vitest_1.it)("rejects kill from dead killer", () => {
        setupPlayers("killer", "target", 30);
        state.players.get("killer").state = shared_1.PlayerState.Dead;
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Killer is not alive");
    });
    (0, vitest_1.it)("rejects kill from Crewmate (not Killer role)", () => {
        // Create a test where the second player is the killer
        // We need to add players in order: crewmate first, then killer
        const crewmate = new GameRoomState_1.Player();
        crewmate.sessionId = "crewmate";
        crewmate.state = shared_1.PlayerState.Alive;
        crewmate.x = 500;
        crewmate.y = 500;
        state.players.set("crewmate", crewmate);
        const killer = new GameRoomState_1.Player();
        killer.sessionId = "killer";
        killer.state = shared_1.PlayerState.Alive;
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
        (0, vitest_1.expect)(roleAssignmentSystem.isKiller("killer")).toBe(true);
        (0, vitest_1.expect)(roleAssignmentSystem.isKiller("crewmate")).toBe(false);
        const result = killSystem.attemptKill("crewmate", "killer");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Only the Killer can kill");
    });
    (0, vitest_1.it)("rejects kill on non-existent target", () => {
        setupPlayers("killer", "target", 30);
        const result = killSystem.attemptKill("killer", "non-existent");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Target not found");
    });
    (0, vitest_1.it)("rejects kill on dead target", () => {
        setupPlayers("killer", "target", 30);
        state.players.get("target").state = shared_1.PlayerState.Dead;
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Target is not alive");
    });
    (0, vitest_1.it)("rejects kill on self", () => {
        setupPlayers("killer", "target", 30);
        const result = killSystem.attemptKill("killer", "killer");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Cannot target self");
    });
    (0, vitest_1.it)("rejects kill when target out of range", () => {
        setupPlayers("killer", "target", shared_1.GAME_CONFIG.KILL_RANGE + 10);
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Target out of range");
    });
    (0, vitest_1.it)("rejects a Killer attack while the Killer is venting", () => {
        setupPlayers("killer", "target", 30);
        killSystem = new KillSystem_1.KillSystem(state, roleAssignmentSystem, testClock, (sessionId) => sessionId === "killer");
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result).toMatchObject({ success: false, reason: "Cannot kill while inside a vent" });
    });
    (0, vitest_1.it)("rejects kill during cooldown", () => {
        setupPlayers("killer", "target1", 30);
        // Add a second target
        const target2 = new GameRoomState_1.Player();
        target2.sessionId = "target2";
        target2.state = shared_1.PlayerState.Alive;
        target2.x = 530;
        target2.y = 500;
        state.players.set("target2", target2);
        // First kill succeeds
        const result1 = killSystem.attemptKill("killer", "target1");
        (0, vitest_1.expect)(result1.success).toBe(true);
        // Second kill immediately fails due to cooldown
        const result2 = killSystem.attemptKill("killer", "target2");
        (0, vitest_1.expect)(result2.success).toBe(false);
        (0, vitest_1.expect)(result2.reason).toBe("Kill on cooldown");
    });
    (0, vitest_1.it)("allows kill after cooldown expires", () => {
        setupPlayers("killer", "target1", 30);
        // First kill
        const result1 = killSystem.attemptKill("killer", "target1");
        (0, vitest_1.expect)(result1.success).toBe(true);
        // Advance time past cooldown
        testClock.advance(shared_1.GAME_CONFIG.KILL_COOLDOWN * 1000 + 1);
        // Add another target
        const target2 = new GameRoomState_1.Player();
        target2.sessionId = "target2";
        target2.state = shared_1.PlayerState.Alive;
        target2.x = 530;
        target2.y = 500;
        state.players.set("target2", target2);
        // Second kill should succeed
        const result2 = killSystem.attemptKill("killer", "target2");
        (0, vitest_1.expect)(result2.success).toBe(true);
    });
    (0, vitest_1.it)("tracks cooldown remaining correctly", () => {
        setupPlayers("killer", "target", 30);
        (0, vitest_1.expect)(killSystem.getCooldownRemaining("killer")).toBe(0);
        killSystem.attemptKill("killer", "target");
        const remaining = killSystem.getCooldownRemaining("killer");
        (0, vitest_1.expect)(remaining).toBe(shared_1.GAME_CONFIG.KILL_COOLDOWN * 1000);
        // Advance half the cooldown
        testClock.advance((shared_1.GAME_CONFIG.KILL_COOLDOWN * 1000) / 2);
        (0, vitest_1.expect)(killSystem.getCooldownRemaining("killer")).toBe((shared_1.GAME_CONFIG.KILL_COOLDOWN * 1000) / 2);
    });
    (0, vitest_1.it)("canKill returns correct status", () => {
        setupPlayers("killer", "target", 30);
        (0, vitest_1.expect)(killSystem.canKill("killer")).toBe(true);
        killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(killSystem.canKill("killer")).toBe(false);
        testClock.advance(shared_1.GAME_CONFIG.KILL_COOLDOWN * 1000 + 1);
        (0, vitest_1.expect)(killSystem.canKill("killer")).toBe(true);
    });
    (0, vitest_1.it)("clearCooldown removes cooldown for specific player", () => {
        setupPlayers("killer", "target", 30);
        killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(killSystem.canKill("killer")).toBe(false);
        killSystem.clearCooldown("killer");
        (0, vitest_1.expect)(killSystem.canKill("killer")).toBe(true);
    });
    (0, vitest_1.it)("clearAllCooldowns removes all cooldowns", () => {
        setupPlayers("killer", "target", 30);
        killSystem.attemptKill("killer", "target");
        const killer2 = new GameRoomState_1.Player();
        killer2.sessionId = "killer2";
        killer2.state = shared_1.PlayerState.Alive;
        killer2.x = 600;
        killer2.y = 600;
        state.players.set("killer2", killer2);
        // Manually set cooldown for killer2
        killSystem["killCooldownUntil"].set("killer2", testClock.now() + 10000);
        killSystem.clearAllCooldowns();
        (0, vitest_1.expect)(killSystem.canKill("killer")).toBe(true);
        (0, vitest_1.expect)(killSystem.canKill("killer2")).toBe(true);
    });
    (0, vitest_1.it)("returns correct kill cooldown config", () => {
        (0, vitest_1.expect)(killSystem.getKillCooldown()).toBe(shared_1.GAME_CONFIG.KILL_COOLDOWN);
    });
    (0, vitest_1.it)("returns correct kill range config", () => {
        (0, vitest_1.expect)(killSystem.getKillRange()).toBe(shared_1.GAME_CONFIG.KILL_RANGE);
    });
    (0, vitest_1.it)("does not allow kill when target at exact range boundary", () => {
        setupPlayers("killer", "target", shared_1.GAME_CONFIG.KILL_RANGE);
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)("does not allow kill when target just beyond range boundary", () => {
        setupPlayers("killer", "target", shared_1.GAME_CONFIG.KILL_RANGE + 0.1);
        const result = killSystem.attemptKill("killer", "target");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Target out of range");
    });
});
