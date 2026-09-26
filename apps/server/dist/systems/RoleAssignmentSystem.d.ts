import { GameRoomState } from "../rooms/schema/GameRoomState";
import { PlayerRole } from "@starfall/shared";
/**
 * Interface for injectable random source
 * Allows deterministic testing
 */
export interface RandomSource {
    random(): number;
    shuffle<T>(array: T[]): T[];
}
/**
 * Default random source using Math.random
 */
export declare class DefaultRandomSource implements RandomSource {
    random(): number;
    shuffle<T>(array: T[]): T[];
}
/**
 * RoleAssignmentSystem handles private role assignment
 * Roles are never stored in public state - only delivered privately to each client
 */
export declare class RoleAssignmentSystem {
    private state;
    private randomSource;
    private roleMap;
    constructor(state: GameRoomState, randomSource?: RandomSource);
    /**
     * Assign roles to all alive players in the lobby
     * Exactly one Killer, rest Crewmates
     * Returns a map of sessionId -> role for private delivery
     */
    assignRoles(): Map<string, PlayerRole>;
    /**
     * Get the role for a specific player (private access)
     */
    getRole(sessionId: string): PlayerRole | undefined;
    /**
     * Check if a player is the Killer (private access)
     */
    isKiller(sessionId: string): boolean;
    /**
     * Get all role assignments (for testing/debugging only)
     * Should not be used for network synchronization
     */
    getAllRoles(): Map<string, PlayerRole>;
    /**
     * Get the count of Killers assigned
     */
    getKillerCount(): number;
    /**
     * Get the count of Crewmates assigned
     */
    getCrewmateCount(): number;
    /**
     * Validate that role assignment is correct
     * Exactly one Killer, all alive players assigned
     */
    validateAssignment(): boolean;
    /**
     * Get count of alive players
     */
    private getAlivePlayerCount;
    /**
     * Clear all role assignments
     */
    clearRoles(): void;
    /** Remove all private role state for a permanently departed player. */
    clearPlayer(sessionId: string): void;
    /**
     * Set a custom random source (for testing)
     */
    setRandomSource(randomSource: RandomSource): void;
}
//# sourceMappingURL=RoleAssignmentSystem.d.ts.map