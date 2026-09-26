"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleAssignmentSystem = exports.DefaultRandomSource = void 0;
const shared_1 = require("@starfall/shared");
/**
 * Default random source using Math.random
 */
class DefaultRandomSource {
    random() {
        return Math.random();
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
exports.DefaultRandomSource = DefaultRandomSource;
/**
 * RoleAssignmentSystem handles private role assignment
 * Roles are never stored in public state - only delivered privately to each client
 */
class RoleAssignmentSystem {
    constructor(state, randomSource) {
        // Private role map - never serialized to public state
        this.roleMap = new Map();
        this.state = state;
        this.randomSource = randomSource || new DefaultRandomSource();
    }
    /**
     * Assign roles to all alive players in the lobby
     * Exactly one Killer, rest Crewmates
     * Returns a map of sessionId -> role for private delivery
     */
    assignRoles() {
        // Clear previous assignments
        this.roleMap.clear();
        // Get all alive players
        const alivePlayers = [];
        this.state.players.forEach((player, sessionId) => {
            if (player.state === shared_1.PlayerState.Alive) {
                alivePlayers.push({ sessionId, player });
            }
        });
        if (alivePlayers.length === 0) {
            return this.roleMap;
        }
        // Shuffle players for random assignment
        const shuffled = this.randomSource.shuffle(alivePlayers);
        // Assign exactly one Killer (first in shuffled array)
        // Rest are Crewmates
        shuffled.forEach((entry, index) => {
            const role = index === 0 ? shared_1.PlayerRole.Killer : shared_1.PlayerRole.Crewmate;
            this.roleMap.set(entry.sessionId, role);
        });
        return new Map(this.roleMap); // Return copy for private delivery
    }
    /**
     * Get the role for a specific player (private access)
     */
    getRole(sessionId) {
        return this.roleMap.get(sessionId);
    }
    /**
     * Check if a player is the Killer (private access)
     */
    isKiller(sessionId) {
        return this.roleMap.get(sessionId) === shared_1.PlayerRole.Killer;
    }
    /**
     * Get all role assignments (for testing/debugging only)
     * Should not be used for network synchronization
     */
    getAllRoles() {
        return new Map(this.roleMap);
    }
    /**
     * Get the count of Killers assigned
     */
    getKillerCount() {
        let count = 0;
        this.roleMap.forEach((role) => {
            if (role === shared_1.PlayerRole.Killer)
                count++;
        });
        return count;
    }
    /**
     * Get the count of Crewmates assigned
     */
    getCrewmateCount() {
        let count = 0;
        this.roleMap.forEach((role) => {
            if (role === shared_1.PlayerRole.Crewmate)
                count++;
        });
        return count;
    }
    /**
     * Validate that role assignment is correct
     * Exactly one Killer, all alive players assigned
     */
    validateAssignment() {
        const aliveCount = this.getAlivePlayerCount();
        if (aliveCount === 0)
            return false;
        const killerCount = this.getKillerCount();
        const crewmateCount = this.getCrewmateCount();
        return (killerCount === 1 &&
            crewmateCount === aliveCount - 1 &&
            this.roleMap.size === aliveCount);
    }
    /**
     * Get count of alive players
     */
    getAlivePlayerCount() {
        let count = 0;
        this.state.players.forEach((player) => {
            if (player.state === shared_1.PlayerState.Alive) {
                count++;
            }
        });
        return count;
    }
    /**
     * Clear all role assignments
     */
    clearRoles() {
        this.roleMap.clear();
    }
    /** Remove all private role state for a permanently departed player. */
    clearPlayer(sessionId) {
        this.roleMap.delete(sessionId);
    }
    /**
     * Set a custom random source (for testing)
     */
    setRandomSource(randomSource) {
        this.randomSource = randomSource;
    }
}
exports.RoleAssignmentSystem = RoleAssignmentSystem;
