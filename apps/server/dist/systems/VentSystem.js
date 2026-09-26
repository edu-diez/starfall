"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VentSystem = void 0;
const shared_1 = require("@starfall/shared");
/**
 * Owns private Killer vent occupancy and authoritative vent transitions.
 * Occupancy is intentionally not synchronized in GameRoomState because it
 * would reveal the Killer role to other clients.
 */
class VentSystem {
    constructor(state, roleAssignmentSystem) {
        this.state = state;
        this.roleAssignmentSystem = roleAssignmentSystem;
        this.ventOccupants = new Map();
    }
    enter(sessionId, nodeId) {
        const authorization = this.validateKillerInPlayingPhase(sessionId);
        if (!authorization.success)
            return authorization;
        if (this.ventOccupants.has(sessionId)) {
            return { success: false, reason: "Already inside a vent" };
        }
        const node = (0, shared_1.findVentNode)(nodeId);
        if (!node) {
            return { success: false, reason: "Unknown vent node" };
        }
        const player = this.state.players.get(sessionId);
        if (this.distanceToNode(player, node) > node.radius) {
            return { success: false, reason: "Vent is out of range" };
        }
        this.ventOccupants.set(sessionId, node.id);
        return { success: true };
    }
    travel(sessionId, destinationNodeId) {
        const authorization = this.validateKillerInPlayingPhase(sessionId);
        if (!authorization.success)
            return authorization;
        const currentNodeId = this.ventOccupants.get(sessionId);
        if (!currentNodeId) {
            return { success: false, reason: "Not inside a vent" };
        }
        const destination = (0, shared_1.findVentNode)(destinationNodeId);
        if (!destination) {
            return { success: false, reason: "Unknown vent node" };
        }
        const isConnected = (0, shared_1.getConnectedVentNodes)(currentNodeId).some((node) => node.id === destination.id);
        if (!isConnected) {
            return { success: false, reason: "Vent destination is not connected" };
        }
        this.ventOccupants.set(sessionId, destination.id);
        return { success: true };
    }
    exit(sessionId) {
        const authorization = this.validateKillerInPlayingPhase(sessionId);
        if (!authorization.success)
            return authorization;
        const currentNodeId = this.ventOccupants.get(sessionId);
        if (!currentNodeId) {
            return { success: false, reason: "Not inside a vent" };
        }
        const node = (0, shared_1.findVentNode)(currentNodeId);
        if (!node) {
            this.ventOccupants.delete(sessionId);
            return { success: false, reason: "Current vent node is unavailable" };
        }
        const player = this.state.players.get(sessionId);
        player.x = node.x;
        player.y = node.y;
        this.ventOccupants.delete(sessionId);
        return { success: true };
    }
    isVenting(sessionId) {
        return this.ventOccupants.has(sessionId);
    }
    getCurrentNodeId(sessionId) {
        return this.ventOccupants.get(sessionId) ?? null;
    }
    getConnectedNodeIds(sessionId) {
        const currentNodeId = this.ventOccupants.get(sessionId);
        return currentNodeId
            ? (0, shared_1.getConnectedVentNodes)(currentNodeId).map((node) => node.id)
            : [];
    }
    clearPlayer(sessionId) {
        this.ventOccupants.delete(sessionId);
    }
    clearAll() {
        this.ventOccupants.clear();
    }
    validateKillerInPlayingPhase(sessionId) {
        if (this.state.phase !== shared_1.GamePhase.Playing) {
            return { success: false, reason: "Vent actions only allowed during playing phase" };
        }
        const player = this.state.players.get(sessionId);
        if (!player) {
            return { success: false, reason: "Player not found" };
        }
        if (player.state !== shared_1.PlayerState.Alive) {
            return { success: false, reason: "Only living players can use vents" };
        }
        if (this.roleAssignmentSystem.getRole(sessionId) !== shared_1.PlayerRole.Killer) {
            return { success: false, reason: "Only the Killer can use vents" };
        }
        return { success: true };
    }
    distanceToNode(player, node) {
        return Math.hypot(player.x - node.x, player.y - node.y);
    }
}
exports.VentSystem = VentSystem;
