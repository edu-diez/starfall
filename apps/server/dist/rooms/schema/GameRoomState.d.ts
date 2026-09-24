import { Schema, MapSchema } from "@colyseus/schema";
import { PlayerRole, PlayerState, GamePhase, type Color } from "@amongus/shared";
export declare class Player extends Schema {
    sessionId: string;
    name: string;
    color: Color;
    role: PlayerRole;
    state: PlayerState;
    x: number;
    y: number;
    lastInputTimestamp: number;
}
export declare class GameRoomState extends Schema {
    players: MapSchema<Player, string>;
    phase: GamePhase;
    matchStartTime: number;
    meetingEndTime: number;
    createPlayer(sessionId: string, name: string, color: Color): Player;
}
//# sourceMappingURL=GameRoomState.d.ts.map