import { Room, Client } from "colyseus";
import { GameRoomState } from "./schema/GameRoomState";
export declare class GameRoom extends Room<GameRoomState> {
    maxClients: 10;
    onCreate(options: any): void;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented: boolean): void;
    onDispose(): void;
    private handleJoin;
    private handleLeave;
}
//# sourceMappingURL=GameRoom.d.ts.map