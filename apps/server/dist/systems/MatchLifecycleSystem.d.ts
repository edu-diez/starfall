import { GameRoomState } from "../rooms/schema/GameRoomState";
import { GamePhase } from "@starfall/shared";
import { LobbySystem } from "./LobbySystem";
export declare class MatchLifecycleSystem {
    private state;
    private lobbySystem;
    private matchId;
    constructor(state: GameRoomState, lobbySystem: LobbySystem);
    /**
     * Get the current match ID
     */
    getMatchId(): number;
    /**
     * Check if the room is in a valid phase for match start
     */
    canStartMatch(): boolean;
    /**
     * Start the match - transitions from Lobby to AssigningRoles
     * Returns true if successful, false if not in lobby or requirements not met
     */
    startMatch(): boolean;
    /**
     * Complete role assignment and transition to Playing phase
     */
    completeRoleAssignment(): void;
    /**
     * End the match and transition to GameOver phase
     */
    endMatch(): void;
    /**
     * Reset the match for a new game (administrative reset)
     * Returns to Lobby phase
     */
    resetMatch(): void;
    /**
     * Get the current phase
     */
    getPhase(): GamePhase;
    /**
     * Check if the match is in progress (playing or meeting)
     */
    isMatchInProgress(): boolean;
    /**
     * Check if roles are being assigned
     */
    isAssigningRoles(): boolean;
    /**
     * Check if in lobby
     */
    isInLobby(): boolean;
    /**
     * Check if game is over
     */
    isGameOver(): boolean;
}
//# sourceMappingURL=MatchLifecycleSystem.d.ts.map