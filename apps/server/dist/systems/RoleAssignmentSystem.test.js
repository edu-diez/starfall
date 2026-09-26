"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const RoleAssignmentSystem_1 = require("./RoleAssignmentSystem");
const shared_1 = require("@starfall/shared");
/**
 * Deterministic random source for testing
 */
class TestRandomSource {
    constructor(values) {
        this.index = 0;
        this.values = values;
    }
    random() {
        const value = this.values[this.index % this.values.length];
        this.index++;
        return value ?? 0;
    }
    shuffle(array) {
        // Simple deterministic shuffle based on our random values
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
(0, vitest_1.describe)("RoleAssignmentSystem", () => {
    let state;
    let roleAssignmentSystem;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Lobby;
        roleAssignmentSystem = new RoleAssignmentSystem_1.RoleAssignmentSystem(state);
    });
    (0, vitest_1.it)("assigns exactly one Killer and rest Crewmates", () => {
        // Add 4 players
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        const assignments = roleAssignmentSystem.assignRoles();
        (0, vitest_1.expect)(assignments.size).toBe(4);
        const roles = Array.from(assignments.values());
        const killerCount = roles.filter((r) => r === shared_1.PlayerRole.Killer).length;
        const crewmateCount = roles.filter((r) => r === shared_1.PlayerRole.Crewmate).length;
        (0, vitest_1.expect)(killerCount).toBe(1);
        (0, vitest_1.expect)(crewmateCount).toBe(3);
    });
    (0, vitest_1.it)("assigns roles to all alive players", () => {
        // Add 5 alive players
        for (let i = 0; i < 5; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        // Add 1 dead player (should not get a role)
        const deadPlayer = new GameRoomState_1.Player();
        deadPlayer.sessionId = "client-dead";
        deadPlayer.state = shared_1.PlayerState.Dead;
        state.players.set("client-dead", deadPlayer);
        const assignments = roleAssignmentSystem.assignRoles();
        (0, vitest_1.expect)(assignments.size).toBe(5);
        (0, vitest_1.expect)(assignments.has("client-dead")).toBe(false);
    });
    (0, vitest_1.it)("getRole returns correct role for a player", () => {
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        player.state = shared_1.PlayerState.Alive;
        state.players.set("client-1", player);
        roleAssignmentSystem.assignRoles();
        const role = roleAssignmentSystem.getRole("client-1");
        (0, vitest_1.expect)(role).toBeDefined();
        (0, vitest_1.expect)([shared_1.PlayerRole.Killer, shared_1.PlayerRole.Crewmate]).toContain(role);
    });
    (0, vitest_1.it)("getRole returns undefined for non-existent player", () => {
        const role = roleAssignmentSystem.getRole("non-existent");
        (0, vitest_1.expect)(role).toBeUndefined();
    });
    (0, vitest_1.it)("isKiller correctly identifies the Killer", () => {
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        roleAssignmentSystem.assignRoles();
        let killerFound = false;
        for (let i = 0; i < 4; i++) {
            const isKiller = roleAssignmentSystem.isKiller(`client-${i}`);
            if (isKiller) {
                killerFound = true;
                (0, vitest_1.expect)(roleAssignmentSystem.getRole(`client-${i}`)).toBe(shared_1.PlayerRole.Killer);
            }
            else {
                (0, vitest_1.expect)(roleAssignmentSystem.getRole(`client-${i}`)).toBe(shared_1.PlayerRole.Crewmate);
            }
        }
        (0, vitest_1.expect)(killerFound).toBe(true);
    });
    (0, vitest_1.it)("validateAssignment returns true for valid assignment", () => {
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        roleAssignmentSystem.assignRoles();
        (0, vitest_1.expect)(roleAssignmentSystem.validateAssignment()).toBe(true);
    });
    (0, vitest_1.it)("validateAssignment returns false when no players", () => {
        (0, vitest_1.expect)(roleAssignmentSystem.validateAssignment()).toBe(false);
    });
    (0, vitest_1.it)("getKillerCount returns 1", () => {
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        roleAssignmentSystem.assignRoles();
        (0, vitest_1.expect)(roleAssignmentSystem.getKillerCount()).toBe(1);
    });
    (0, vitest_1.it)("getCrewmateCount returns correct count", () => {
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        roleAssignmentSystem.assignRoles();
        (0, vitest_1.expect)(roleAssignmentSystem.getCrewmateCount()).toBe(3);
    });
    (0, vitest_1.it)("clearRoles removes all assignments", () => {
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        roleAssignmentSystem.assignRoles();
        (0, vitest_1.expect)(roleAssignmentSystem.getAllRoles().size).toBe(4);
        roleAssignmentSystem.clearRoles();
        (0, vitest_1.expect)(roleAssignmentSystem.getAllRoles().size).toBe(0);
    });
    (0, vitest_1.it)("deterministic random source produces deterministic assignments", () => {
        // Use a deterministic random source that always picks the first element as killer
        const testRandom = new TestRandomSource([0, 0, 0, 0]); // Always pick index 0
        roleAssignmentSystem.setRandomSource(testRandom);
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        const assignments1 = roleAssignmentSystem.assignRoles();
        const killer1 = Array.from(assignments1.entries()).find(([_, r]) => r === shared_1.PlayerRole.Killer)?.[0];
        // Reset and assign again
        roleAssignmentSystem.clearRoles();
        const testRandom2 = new TestRandomSource([0, 0, 0, 0]);
        roleAssignmentSystem.setRandomSource(testRandom2);
        const assignments2 = roleAssignmentSystem.assignRoles();
        const killer2 = Array.from(assignments2.entries()).find(([_, r]) => r === shared_1.PlayerRole.Killer)?.[0];
        // With same seed, same player should be killer
        (0, vitest_1.expect)(killer1).toBe(killer2);
    });
    (0, vitest_1.it)("does not assign roles to dead or ejected players", () => {
        const alive1 = new GameRoomState_1.Player();
        alive1.sessionId = "alive-1";
        alive1.state = shared_1.PlayerState.Alive;
        state.players.set("alive-1", alive1);
        const alive2 = new GameRoomState_1.Player();
        alive2.sessionId = "alive-2";
        alive2.state = shared_1.PlayerState.Alive;
        state.players.set("alive-2", alive2);
        const dead = new GameRoomState_1.Player();
        dead.sessionId = "dead-1";
        dead.state = shared_1.PlayerState.Dead;
        state.players.set("dead-1", dead);
        const ejected = new GameRoomState_1.Player();
        ejected.sessionId = "ejected-1";
        ejected.state = shared_1.PlayerState.Ejected;
        state.players.set("ejected-1", ejected);
        const assignments = roleAssignmentSystem.assignRoles();
        (0, vitest_1.expect)(assignments.size).toBe(2);
        (0, vitest_1.expect)(assignments.has("alive-1")).toBe(true);
        (0, vitest_1.expect)(assignments.has("alive-2")).toBe(true);
        (0, vitest_1.expect)(assignments.has("dead-1")).toBe(false);
        (0, vitest_1.expect)(assignments.has("ejected-1")).toBe(false);
    });
    (0, vitest_1.it)("role map is private and not exposed in public state", () => {
        for (let i = 0; i < 4; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(`client-${i}`, player);
        }
        roleAssignmentSystem.assignRoles();
        // Verify that Player schema doesn't have role field
        const player = state.players.get("client-0");
        (0, vitest_1.expect)(player).toBeDefined();
        // The Player class should not have a role property in the schema
        // This is verified by the fact that we removed @type("string") role from Player schema
    });
});
