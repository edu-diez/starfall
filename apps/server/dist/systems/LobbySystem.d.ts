import { GameRoomState } from "../rooms/schema/GameRoomState";
import { ColorSystem } from "./ColorSystem";
export declare class LobbySystem {
    private state;
    private colorSystem;
    constructor(state: GameRoomState);
    /**
     * Check if the room is in lobby phase
     */
    isInLobby(): boolean;
    /**
     * Get the minimum players required to start
     */
    getMinPlayers(): number;
    /**
     * Get the maximum players allowed
     */
    getMaxPlayers(): number;
    /**
     * Get current player count
     */
    getPlayerCount(): number;
    /**
     * Get alive player count
     */
    getAlivePlayerCount(): number;
    /**
     * Check if a player can join (room not full, in lobby)
     */
    canJoin(): boolean;
    /**
     * Set a player's ready status
     * Returns true if successful, false if not in lobby or player not found
     */
    setReady(sessionId: string, ready: boolean): boolean;
    /**
     * Get a player's ready status
     */
    getReady(sessionId: string): boolean | null;
    /**
     * Check if the game can start
     * Requirements: minimum players met, all players ready
     */
    canStart(): boolean;
    /**
     * Get lobby state for synchronization
     */
    getLobbyState(): {
        players: Array<{
            sessionId: string;
            name: string;
            color: string;
            ready: boolean;
        }>;
        minPlayers: number;
        maxPlayers: number;
        canStart: boolean;
    };
    /**
     * Handle an already-authorized account joining and assign a unique color.
     */
    handlePlayerJoin(sessionId: string, accountId: string, displayName: string): string;
    /**
     * Handle player leaving - clean up
     */
    handlePlayerLeave(sessionId: string): void;
    /**
     * Handle color change request
     * Returns the new color if successful, null if failed
     */
    handleColorChange(sessionId: string, requestedColor: string): string | null;
    /**
     * Get the ColorSystem instance
     */
    getColorSystem(): ColorSystem;
}
//# sourceMappingURL=LobbySystem.d.ts.map