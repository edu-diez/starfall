import { GameRoomState } from "../rooms/schema/GameRoomState";
import { PlayerRole } from "@starfall/shared";
import { RoleAssignmentSystem } from "./RoleAssignmentSystem";
/**
 * VictorySystem evaluates win conditions
 * It is the ONLY system that determines match winners
 */
export declare class VictorySystem {
    private state;
    private roleAssignmentSystem;
    private winner;
    private endReason;
    constructor(state: GameRoomState, roleAssignmentSystem: RoleAssignmentSystem);
    /**
     * Evaluate victory conditions after any state change that could end the match
     * Returns true if the match has ended, false otherwise
     */
    evaluate(): boolean;
    /**
     * Get living player counts by role
     */
    private getLivingRoleCounts;
    /**
     * Set the winner and end reason, transition to GameOver phase
     */
    private setWinner;
    /**
     * Get the current winner (null if match not ended)
     */
    getWinner(): PlayerRole | null;
    /**
     * Get the end reason (null if match not ended)
     */
    getEndReason(): string | null;
    /**
     * Check if the match has ended
     */
    isMatchEnded(): boolean;
    /**
     * Reset victory state for a new match
     */
    reset(): void;
    /**
     * Force end the match with a specific winner (for testing/admin)
     */
    forceEnd(role: PlayerRole, reason: string): void;
}
//# sourceMappingURL=VictorySystem.d.ts.map