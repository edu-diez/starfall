import { Room, Client } from "colyseus";
import { GameRoomState } from "./schema/GameRoomState";
export declare class GameRoom extends Room<GameRoomState> {
    maxClients: 10;
    private readonly TICK_RATE;
    private readonly TICK_INTERVAL;
    private simulationInterval;
    private lastTickTime;
    private playerInputs;
    private lobbySystem;
    private colorSystem;
    onCreate(options: any): void;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented: boolean): void;
    onDispose(): void;
    private startSimulationLoop;
    private stopSimulationLoop;
    private tick;
    private handleJoin;
    private handleLeave;
    private handleMove;
    private handleColorChange;
    private handleReady;
}
//# sourceMappingURL=GameRoom.d.ts.map