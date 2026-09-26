import { GameRoomState } from "../rooms/schema/GameRoomState";
import { RoleAssignmentSystem } from "./RoleAssignmentSystem";
/**
 * Interface for injectable clock
 * Allows deterministic testing of cooldowns and timers
 */
export interface Clock {
    now(): number;
}
/**
 * Default clock using Date.now()
 */
export declare class DefaultClock implements Clock {
    now(): number;
}
/**
 * KillSystem handles authoritative kill validation and elimination
 * All kill logic is server-side only
 */
export declare class KillSystem {
    private state;
    private roleAssignmentSystem;
    private clock;
    private isVenting;
    private killCooldownUntil;
    constructor(state: GameRoomState, roleAssignmentSystem: RoleAssignmentSystem, clock?: Clock, isVenting?: (sessionId: string) => boolean);
    /**
     * Attempt to perform a kill
     * Returns result with success status and optional error reason
     */
    attemptKill(killerSessionId: string, targetSessionId: string): KillResult;
    /**
     * Perform the actual kill - eliminate target and start cooldown
     */
    private performKill;
    /**
     * Calculate distance between two players
     */
    private calculateDistance;
    /**
     * Get remaining cooldown time for a player (in milliseconds)
     * Returns 0 if no cooldown active
     */
    getCooldownRemaining(sessionId: string): number;
    /**
     * Check if a player can currently kill (cooldown expired)
     */
    canKill(sessionId: string): boolean;
    /**
     * Get the kill cooldown configuration (for client display)
     */
    getKillCooldown(): number;
    /**
     * Get the kill range configuration (for client display)
     */
    getKillRange(): number;
    /**
     * Clear cooldown for a player (e.g., on match reset)
     */
    clearCooldown(sessionId: string): void;
    /**
     * Clear all cooldowns (e.g., on match reset)
     */
    clearAllCooldowns(): void;
    /**
     * Set a custom clock (for testing)
     */
    setClock(clock: Clock): void;
}
/**
 * Result of a kill attempt
 */
export interface KillResult {
    success: boolean;
    reason?: string;
}
//# sourceMappingURL=KillSystem.d.ts.map