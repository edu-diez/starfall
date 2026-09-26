import { Schema, MapSchema } from "@colyseus/schema";
import { PlayerState, GamePhase, type Color } from "@starfall/shared";
export declare class Player extends Schema {
    sessionId: string;
    /** Safe public identifier only; credentials and account records remain private. */
    accountId: string;
    name: string;
    color: Color;
    state: PlayerState;
    x: number;
    y: number;
    lastInputTimestamp: number;
    ready: boolean;
    meetingsUsed: number;
}
export declare class GameRoomState extends Schema {
    players: MapSchema<Player, string>;
    phase: GamePhase;
    matchStartTime: number;
    meetingEndTime: number;
    voteDeadline: number;
    voteResultsEndTime: number;
    voteSubmitted: MapSchema<boolean, string>;
    voteTotals: MapSchema<number, string>;
    abstainVotes: number;
    ejectedPlayerId: string | null;
    ejectedPlayerRole: string | null;
    winner: string | null;
    endReason: string | null;
    createPlayer(sessionId: string, accountId: string, name: string, color: Color): Player;
}
//# sourceMappingURL=GameRoomState.d.ts.map