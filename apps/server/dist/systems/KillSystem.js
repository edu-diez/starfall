"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KillSystem = exports.DefaultClock = void 0;
const shared_1 = require("@starfall/shared");
/**
 * Default clock using Date.now()
 */
class DefaultClock {
    now() {
        return Date.now();
    }
}
exports.DefaultClock = DefaultClock;
/**
 * KillSystem handles authoritative kill validation and elimination
 * All kill logic is server-side only
 */
class KillSystem {
    state;
    roleAssignmentSystem;
    clock;
    isVenting;
    // Private kill cooldown tracking per player (server-only)
    killCooldownUntil = new Map();
    constructor(state, roleAssignmentSystem, clock, isVenting = () => false) {
        this.state = state;
        this.roleAssignmentSystem = roleAssignmentSystem;
        this.clock = clock || new DefaultClock();
        this.isVenting = isVenting;
    }
    /**
     * Attempt to perform a kill
     * Returns result with success status and optional error reason
     */
    attemptKill(killerSessionId, targetSessionId) {
        // Validate phase - only allowed during playing (not during meeting)
        if (this.state.phase !== shared_1.GamePhase.Playing) {
            return { success: false, reason: "Kill only allowed during playing phase" };
        }
        // Validate killer exists and is alive
        const killer = this.state.players.get(killerSessionId);
        if (!killer) {
            return { success: false, reason: "Killer not found" };
        }
        if (killer.state !== shared_1.PlayerState.Alive) {
            return { success: false, reason: "Killer is not alive" };
        }
        // Validate killer has Killer role
        if (!this.roleAssignmentSystem.isKiller(killerSessionId)) {
            return { success: false, reason: "Only the Killer can kill" };
        }
        if (this.isVenting(killerSessionId)) {
            return { success: false, reason: "Cannot kill while inside a vent" };
        }
        // Validate target exists and is alive
        const target = this.state.players.get(targetSessionId);
        if (!target) {
            return { success: false, reason: "Target not found" };
        }
        if (target.state !== shared_1.PlayerState.Alive) {
            return { success: false, reason: "Target is not alive" };
        }
        // Cannot target self
        if (killerSessionId === targetSessionId) {
            return { success: false, reason: "Cannot target self" };
        }
        // Check kill range
        const distance = this.calculateDistance(killer, target);
        if (distance > shared_1.GAME_CONFIG.KILL_RANGE) {
            return { success: false, reason: "Target out of range" };
        }
        // Check kill cooldown
        const cooldownUntil = this.killCooldownUntil.get(killerSessionId) || 0;
        const now = this.clock.now();
        if (now < cooldownUntil) {
            return { success: false, reason: "Kill on cooldown" };
        }
        // All validations passed - perform the kill
        this.performKill(killerSessionId, targetSessionId);
        return { success: true };
    }
    /**
     * Perform the actual kill - eliminate target and start cooldown
     */
    performKill(killerSessionId, targetSessionId) {
        const target = this.state.players.get(targetSessionId);
        if (!target)
            return;
        // Mark target as dead
        target.state = shared_1.PlayerState.Dead;
        // Set kill cooldown for killer
        const now = this.clock.now();
        this.killCooldownUntil.set(killerSessionId, now + shared_1.GAME_CONFIG.KILL_COOLDOWN * 1000);
    }
    /**
     * Calculate distance between two players
     */
    calculateDistance(player1, player2) {
        const dx = player1.x - player2.x;
        const dy = player1.y - player2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Get remaining cooldown time for a player (in milliseconds)
     * Returns 0 if no cooldown active
     */
    getCooldownRemaining(sessionId) {
        const cooldownUntil = this.killCooldownUntil.get(sessionId) || 0;
        const now = this.clock.now();
        return Math.max(0, cooldownUntil - now);
    }
    /**
     * Check if a player can currently kill (cooldown expired)
     */
    canKill(sessionId) {
        return this.getCooldownRemaining(sessionId) === 0;
    }
    /**
     * Get the kill cooldown configuration (for client display)
     */
    getKillCooldown() {
        return shared_1.GAME_CONFIG.KILL_COOLDOWN;
    }
    /**
     * Get the kill range configuration (for client display)
     */
    getKillRange() {
        return shared_1.GAME_CONFIG.KILL_RANGE;
    }
    /**
     * Clear cooldown for a player (e.g., on match reset)
     */
    clearCooldown(sessionId) {
        this.killCooldownUntil.delete(sessionId);
    }
    /**
     * Clear all cooldowns (e.g., on match reset)
     */
    clearAllCooldowns() {
        this.killCooldownUntil.clear();
    }
    /**
     * Set a custom clock (for testing)
     */
    setClock(clock) {
        this.clock = clock;
    }
}
exports.KillSystem = KillSystem;
