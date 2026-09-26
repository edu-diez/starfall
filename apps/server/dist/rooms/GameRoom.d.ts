import { Room, Client } from "colyseus";
import { GameRoomState } from "./schema/GameRoomState";
import { type AccountProfile } from "@starfall/shared";
import type { AuthContext } from "@colyseus/core";
import { type AccountService } from "../services/AccountService";
export declare class GameRoom extends Room<{
    state: GameRoomState;
}> {
    private static accountService;
    static configureAccountService(accountService: AccountService): void;
    maxClients: 10;
    private readonly TICK_RATE;
    private readonly TICK_INTERVAL;
    private simulationInterval;
    private lastTickTime;
    private playerInputs;
    private readonly messageRateLimiter;
    /** Session IDs currently held by Colyseus for reconnecting clients. */
    private reconnectingSessionIds;
    private lobbySystem;
    private colorSystem;
    private matchLifecycleSystem;
    private roleAssignmentSystem;
    private collisionSystem;
    private killSystem;
    private victorySystem;
    private meetingSystem;
    private votingSystem;
    private ventSystem;
    onCreate(options: any): void;
    onAuth(_client: Client, _options: unknown, context: AuthContext): Promise<AccountProfile>;
    onJoin(client: Client, _options: unknown): void;
    onDrop(client: Client, _code?: number): void;
    onReconnect(client: Client): void;
    onLeave(client: Client, _code?: number): void;
    onDispose(): void;
    private startSimulationLoop;
    private stopSimulationLoop;
    private tick;
    private handleJoin;
    private refreshPlayerProfile;
    private handleLeave;
    /** Permanently remove a session only after consented leave or grace expiry. */
    private handlePermanentLeave;
    private handleMove;
    private handleColorChange;
    private handleReady;
    private handleMatchStart;
    private handleKill;
    private handleGameOver;
    private handleCallMeeting;
    private handleMeetingEnded;
    private handleVentEnter;
    private handleVentTravel;
    private handleVentExit;
    private sendVentState;
    private handleVote;
    private handleVoteResolution;
    private handleVoteResultsFinished;
    private clearAllPlayerInputs;
    private broadcastMeetingState;
    /** Validate basic message size and server-private rate limits before routing. */
    private acceptsMessage;
    /** Restore only information that the reconnecting player is entitled to see. */
    private sendPrivateRecoveryState;
}
//# sourceMappingURL=GameRoom.d.ts.map