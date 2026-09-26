import { GameRoomState } from "../rooms/schema/GameRoomState";
import { RoleAssignmentSystem } from "./RoleAssignmentSystem";
export interface VentResult {
    success: boolean;
    reason?: string;
}
/**
 * Owns private Killer vent occupancy and authoritative vent transitions.
 * Occupancy is intentionally not synchronized in GameRoomState because it
 * would reveal the Killer role to other clients.
 */
export declare class VentSystem {
    private readonly state;
    private readonly roleAssignmentSystem;
    private readonly ventOccupants;
    constructor(state: GameRoomState, roleAssignmentSystem: RoleAssignmentSystem);
    enter(sessionId: string, nodeId: string): VentResult;
    travel(sessionId: string, destinationNodeId: string): VentResult;
    exit(sessionId: string): VentResult;
    isVenting(sessionId: string): boolean;
    getCurrentNodeId(sessionId: string): string | null;
    getConnectedNodeIds(sessionId: string): string[];
    clearPlayer(sessionId: string): void;
    clearAll(): void;
    private validateKillerInPlayingPhase;
    private distanceToNode;
}
//# sourceMappingURL=VentSystem.d.ts.map