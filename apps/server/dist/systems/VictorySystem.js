"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VictorySystem = void 0;
const shared_1 = require("@starfall/shared");
/**
 * VictorySystem evaluates win conditions
 * It is the ONLY system that determines match winners
 */
class VictorySystem {
    state;
    roleAssignmentSystem;
    // Winner and end reason (set when match ends)
    winner = null;
    endReason = null;
    constructor(state, roleAssignmentSystem) {
        this.state = state;
        this.roleAssignmentSystem = roleAssignmentSystem;
    }
    /**
     * Evaluate victory conditions after any state change that could end the match
     * Returns true if the match has ended, false otherwise
     */
    evaluate() {
        // Only evaluate during playing phase
        if (this.state.phase !== shared_1.GamePhase.Playing) {
            return false;
        }
        const livingCounts = this.getLivingRoleCounts();
        // Killer victory: Living Killers >= Living Crewmates
        if (livingCounts.killers >= livingCounts.crewmates && livingCounts.killers > 0) {
            this.setWinner(shared_1.PlayerRole.Killer, "Killer reached parity with Crewmates");
            return true;
        }
        // Crewmate victory: No living Killers (Killer was ejected or eliminated)
        if (livingCounts.killers === 0 && livingCounts.crewmates > 0) {
            this.setWinner(shared_1.PlayerRole.Crewmate, "All Killers eliminated");
            return true;
        }
        // No winner yet
        return false;
    }
    /**
     * Get living player counts by role
     */
    getLivingRoleCounts() {
        let killers = 0;
        let crewmates = 0;
        this.state.players.forEach((player, sessionId) => {
            if (player.state !== shared_1.PlayerState.Alive)
                return;
            const role = this.roleAssignmentSystem.getRole(sessionId);
            if (role === shared_1.PlayerRole.Killer) {
                killers++;
            }
            else if (role === shared_1.PlayerRole.Crewmate) {
                crewmates++;
            }
        });
        return { killers, crewmates };
    }
    /**
     * Set the winner and end reason, transition to GameOver phase
     */
    setWinner(role, reason) {
        this.winner = role;
        this.endReason = reason;
        this.state.phase = shared_1.GamePhase.GameOver;
    }
    /**
     * Get the current winner (null if match not ended)
     */
    getWinner() {
        return this.winner;
    }
    /**
     * Get the end reason (null if match not ended)
     */
    getEndReason() {
        return this.endReason;
    }
    /**
     * Check if the match has ended
     */
    isMatchEnded() {
        return this.state.phase === shared_1.GamePhase.GameOver;
    }
    /**
     * Reset victory state for a new match
     */
    reset() {
        this.winner = null;
        this.endReason = null;
        // Reset phase back to Playing if it was GameOver
        if (this.state.phase === shared_1.GamePhase.GameOver) {
            this.state.phase = shared_1.GamePhase.Playing;
        }
    }
    /**
     * Force end the match with a specific winner (for testing/admin)
     */
    forceEnd(role, reason) {
        this.setWinner(role, reason);
    }
}
exports.VictorySystem = VictorySystem;
