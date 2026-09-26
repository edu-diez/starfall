"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const VictorySystem_1 = require("./VictorySystem");
const RoleAssignmentSystem_1 = require("./RoleAssignmentSystem");
const shared_1 = require("@starfall/shared");
/**
 * Deterministic random source for testing
 */
class TestRandomSource {
    values;
    index = 0;
    constructor(values) {
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
(0, vitest_1.describe)("VictorySystem", () => {
    let state;
    let roleAssignmentSystem;
    let victorySystem;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Playing;
        // Use a random source that keeps the first player as killer
        roleAssignmentSystem = new RoleAssignmentSystem_1.RoleAssignmentSystem(state, new TestRandomSource([0.99, 0.99, 0.99, 0.99]));
        victorySystem = new VictorySystem_1.VictorySystem(state, roleAssignmentSystem);
    });
    const setupPlayers = (killerCount, crewmateCount, allAlive = true) => {
        let sessionId = 0;
        // Add killers
        for (let i = 0; i < killerCount; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `killer-${sessionId}`;
            player.state = allAlive ? shared_1.PlayerState.Alive : shared_1.PlayerState.Dead;
            player.x = 100 + i * 50;
            player.y = 100;
            state.players.set(`killer-${sessionId}`, player);
            sessionId++;
        }
        // Add crewmates
        for (let i = 0; i < crewmateCount; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `crewmate-${sessionId}`;
            player.state = allAlive ? shared_1.PlayerState.Alive : shared_1.PlayerState.Dead;
            player.x = 200 + i * 50;
            player.y = 200;
            state.players.set(`crewmate-${sessionId}`, player);
            sessionId++;
        }
        roleAssignmentSystem.assignRoles();
    };
    (0, vitest_1.it)("returns false when match not ended", () => {
        setupPlayers(1, 3);
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(false);
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(false);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBeNull();
    });
    (0, vitest_1.it)("detects Killer victory when living Killers >= living Crewmates", () => {
        // 1 killer, 1 crewmate alive = parity, killer wins
        setupPlayers(1, 1);
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Killer);
        (0, vitest_1.expect)(victorySystem.getEndReason()).toBe("Killer reached parity with Crewmates");
    });
    (0, vitest_1.it)("detects Killer victory when multiple killers >= crewmates", () => {
        // 2 killers, 1 crewmate = killer wins
        // Need to ensure both killers get the killer role
        // We'll manually set up players and assign roles
        state.players.clear();
        const killer1 = new GameRoomState_1.Player();
        killer1.sessionId = "killer-1";
        killer1.state = shared_1.PlayerState.Alive;
        killer1.x = 100;
        killer1.y = 100;
        state.players.set("killer-1", killer1);
        const killer2 = new GameRoomState_1.Player();
        killer2.sessionId = "killer-2";
        killer2.state = shared_1.PlayerState.Alive;
        killer2.x = 150;
        killer2.y = 100;
        state.players.set("killer-2", killer2);
        const crewmate1 = new GameRoomState_1.Player();
        crewmate1.sessionId = "crewmate-1";
        crewmate1.state = shared_1.PlayerState.Alive;
        crewmate1.x = 200;
        crewmate1.y = 200;
        state.players.set("crewmate-1", crewmate1);
        // Use a random source that makes both first players killers
        // This is tricky with the current system - let's just test with 1 killer
        // and verify the logic works
        roleAssignmentSystem.assignRoles();
        // Manually set both as killers for this test
        roleAssignmentSystem["roleMap"].set("killer-1", shared_1.PlayerRole.Killer);
        roleAssignmentSystem["roleMap"].set("killer-2", shared_1.PlayerRole.Killer);
        roleAssignmentSystem["roleMap"].set("crewmate-1", shared_1.PlayerRole.Crewmate);
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Killer);
    });
    (0, vitest_1.it)("detects Crewmate victory when no living killers", () => {
        // 1 killer dead, 3 crewmates alive = crewmates win
        setupPlayers(1, 3);
        // Kill the killer
        state.players.get("killer-0").state = shared_1.PlayerState.Dead;
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Crewmate);
        (0, vitest_1.expect)(victorySystem.getEndReason()).toBe("All Killers eliminated");
    });
    (0, vitest_1.it)("does not end match when both sides have living players and no parity", () => {
        // 1 killer, 3 crewmates = no winner yet
        setupPlayers(1, 3);
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(false);
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(false);
    });
    (0, vitest_1.it)("does not evaluate when not in playing phase", () => {
        state.phase = shared_1.GamePhase.Lobby;
        setupPlayers(1, 1);
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(false);
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(false);
    });
    (0, vitest_1.it)("does not evaluate when in meeting phase", () => {
        state.phase = shared_1.GamePhase.Meeting;
        setupPlayers(1, 1);
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(false);
    });
    (0, vitest_1.it)("detects Crewmate victory for a Killer ejected during vote resolution", () => {
        setupPlayers(1, 3);
        state.players.get("killer-0").state = shared_1.PlayerState.Ejected;
        state.phase = shared_1.GamePhase.ResolvingVote;
        (0, vitest_1.expect)(victorySystem.evaluate()).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Crewmate);
    });
    (0, vitest_1.it)("does not evaluate when in game over phase", () => {
        state.phase = shared_1.GamePhase.GameOver;
        setupPlayers(1, 1);
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(false);
    });
    (0, vitest_1.it)("ignores dead players in victory calculation", () => {
        // 1 killer alive, 1 crewmate alive, 2 crewmates dead
        setupPlayers(1, 3);
        // Kill 2 crewmates
        state.players.get("crewmate-1").state = shared_1.PlayerState.Dead;
        state.players.get("crewmate-2").state = shared_1.PlayerState.Dead;
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Killer);
    });
    (0, vitest_1.it)("ignores ejected players in victory calculation", () => {
        setupPlayers(1, 3);
        // Eject 2 crewmates
        state.players.get("crewmate-1").state = shared_1.PlayerState.Ejected;
        state.players.get("crewmate-2").state = shared_1.PlayerState.Ejected;
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Killer);
    });
    (0, vitest_1.it)("reset clears winner and end reason", () => {
        setupPlayers(1, 1);
        victorySystem.evaluate();
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(true);
        victorySystem.reset();
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(false);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBeNull();
        (0, vitest_1.expect)(victorySystem.getEndReason()).toBeNull();
    });
    (0, vitest_1.it)("forceEnd sets winner and reason", () => {
        victorySystem.forceEnd(shared_1.PlayerRole.Crewmate, "Test reason");
        (0, vitest_1.expect)(victorySystem.isMatchEnded()).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Crewmate);
        (0, vitest_1.expect)(victorySystem.getEndReason()).toBe("Test reason");
    });
    (0, vitest_1.it)("correctly counts living players by role", () => {
        setupPlayers(1, 4);
        // Kill 2 crewmates
        state.players.get("crewmate-1").state = shared_1.PlayerState.Dead;
        state.players.get("crewmate-2").state = shared_1.PlayerState.Dead;
        // 1 killer, 2 crewmates alive = no winner
        let result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(false);
        // Kill another crewmate
        state.players.get("crewmate-3").state = shared_1.PlayerState.Dead;
        // 1 killer, 1 crewmate = killer wins
        result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Killer);
    });
    (0, vitest_1.it)("handles edge case: no living players", () => {
        setupPlayers(1, 1, false); // both dead
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(false); // No winner if no one alive
    });
    (0, vitest_1.it)("handles edge case: only dead killers and living crewmates", () => {
        // Set up 1 killer and 2 crewmates, all alive initially
        setupPlayers(1, 2, true);
        // Then kill the killer
        state.players.get("killer-0").state = shared_1.PlayerState.Dead;
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Crewmate);
    });
    (0, vitest_1.it)("handles edge case: only living killers and dead crewmates", () => {
        setupPlayers(1, 2);
        state.players.get("crewmate-1").state = shared_1.PlayerState.Dead;
        state.players.get("crewmate-2").state = shared_1.PlayerState.Dead;
        const result = victorySystem.evaluate();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(victorySystem.getWinner()).toBe(shared_1.PlayerRole.Killer);
    });
});
