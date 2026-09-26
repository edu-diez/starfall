import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import {
  findVentNode,
  getConnectedVentNodes,
  GamePhase,
  PlayerRole,
  PlayerState,
  STARFALL_MAP,
  type VentNode,
} from "@starfall/shared";
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
export class VentSystem {
  private readonly ventOccupants = new Map<string, string>();

  constructor(
    private readonly state: GameRoomState,
    private readonly roleAssignmentSystem: RoleAssignmentSystem,
  ) {}

  enter(sessionId: string, nodeId: string): VentResult {
    const authorization = this.validateKillerInPlayingPhase(sessionId);
    if (!authorization.success) return authorization;

    if (this.ventOccupants.has(sessionId)) {
      return { success: false, reason: "Already inside a vent" };
    }

    const node = findVentNode(nodeId);
    if (!node) {
      return { success: false, reason: "Unknown vent node" };
    }

    const player = this.state.players.get(sessionId)!;
    if (this.distanceToNode(player, node) > node.radius) {
      return { success: false, reason: "Vent is out of range" };
    }

    this.ventOccupants.set(sessionId, node.id);
    return { success: true };
  }

  travel(sessionId: string, destinationNodeId: string): VentResult {
    const authorization = this.validateKillerInPlayingPhase(sessionId);
    if (!authorization.success) return authorization;

    const currentNodeId = this.ventOccupants.get(sessionId);
    if (!currentNodeId) {
      return { success: false, reason: "Not inside a vent" };
    }

    const destination = findVentNode(destinationNodeId);
    if (!destination) {
      return { success: false, reason: "Unknown vent node" };
    }

    const isConnected = getConnectedVentNodes(currentNodeId).some(
      (node) => node.id === destination.id,
    );
    if (!isConnected) {
      return { success: false, reason: "Vent destination is not connected" };
    }

    this.ventOccupants.set(sessionId, destination.id);
    return { success: true };
  }

  exit(sessionId: string): VentResult {
    const authorization = this.validateKillerInPlayingPhase(sessionId);
    if (!authorization.success) return authorization;

    const currentNodeId = this.ventOccupants.get(sessionId);
    if (!currentNodeId) {
      return { success: false, reason: "Not inside a vent" };
    }

    const node = findVentNode(currentNodeId);
    if (!node) {
      this.ventOccupants.delete(sessionId);
      return { success: false, reason: "Current vent node is unavailable" };
    }

    const player = this.state.players.get(sessionId)!;
    player.x = node.x;
    player.y = node.y;
    this.ventOccupants.delete(sessionId);
    return { success: true };
  }

  isVenting(sessionId: string): boolean {
    return this.ventOccupants.has(sessionId);
  }

  getCurrentNodeId(sessionId: string): string | null {
    return this.ventOccupants.get(sessionId) ?? null;
  }

  getConnectedNodeIds(sessionId: string): string[] {
    const currentNodeId = this.ventOccupants.get(sessionId);
    return currentNodeId
      ? getConnectedVentNodes(currentNodeId).map((node) => node.id)
      : [];
  }

  clearPlayer(sessionId: string): void {
    this.ventOccupants.delete(sessionId);
  }

  clearAll(): void {
    this.ventOccupants.clear();
  }

  private validateKillerInPlayingPhase(sessionId: string): VentResult {
    if (this.state.phase !== GamePhase.Playing) {
      return { success: false, reason: "Vent actions only allowed during playing phase" };
    }

    const player = this.state.players.get(sessionId);
    if (!player) {
      return { success: false, reason: "Player not found" };
    }
    if (player.state !== PlayerState.Alive) {
      return { success: false, reason: "Only living players can use vents" };
    }
    if (this.roleAssignmentSystem.getRole(sessionId) !== PlayerRole.Killer) {
      return { success: false, reason: "Only the Killer can use vents" };
    }

    return { success: true };
  }

  private distanceToNode(player: Player, node: VentNode): number {
    return Math.hypot(player.x - node.x, player.y - node.y);
  }
}
