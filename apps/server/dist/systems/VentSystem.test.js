"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const VentSystem_1 = require("./VentSystem");
const RoleAssignmentSystem_1 = require("./RoleAssignmentSystem");
const shared_1 = require("@starfall/shared");
class FirstPlayerRandomSource {
    random() {
        return 0.99;
    }
    shuffle(items) {
        return [...items];
    }
}
(0, vitest_1.describe)("VentSystem", () => {
    let state;
    let roles;
    let vents;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Playing;
        roles = new RoleAssignmentSystem_1.RoleAssignmentSystem(state, new FirstPlayerRandomSource());
        vents = new VentSystem_1.VentSystem(state, roles);
        const killer = new GameRoomState_1.Player();
        killer.sessionId = "killer";
        killer.state = shared_1.PlayerState.Alive;
        killer.x = 960;
        killer.y = 150;
        state.players.set(killer.sessionId, killer);
        const crewmate = new GameRoomState_1.Player();
        crewmate.sessionId = "crewmate";
        crewmate.state = shared_1.PlayerState.Alive;
        crewmate.x = 200;
        crewmate.y = 375;
        state.players.set(crewmate.sessionId, crewmate);
        roles.assignRoles();
    });
    (0, vitest_1.it)("keeps vent occupancy private and allows only the Killer to enter", () => {
        (0, vitest_1.expect)(roles.getRole("killer")).toBe(shared_1.PlayerRole.Killer);
        (0, vitest_1.expect)(vents.enter("crewmate", "vent-medbay")).toMatchObject({
            success: false,
            reason: "Only the Killer can use vents",
        });
        (0, vitest_1.expect)(vents.enter("killer", "vent-bridge")).toEqual({ success: true });
        (0, vitest_1.expect)(vents.isVenting("killer")).toBe(true);
        (0, vitest_1.expect)(Object.keys(state)).not.toContain("ventOccupants");
    });
    (0, vitest_1.it)("rejects distant, unknown, dead, and non-playing vent entry", () => {
        (0, vitest_1.expect)(vents.enter("killer", "unknown")).toMatchObject({ success: false, reason: "Unknown vent node" });
        (0, vitest_1.expect)(vents.enter("killer", "vent-medbay")).toMatchObject({ success: false, reason: "Vent is out of range" });
        state.players.get("killer").state = shared_1.PlayerState.Dead;
        (0, vitest_1.expect)(vents.enter("killer", "vent-bridge")).toMatchObject({ success: false, reason: "Only living players can use vents" });
        state.players.get("killer").state = shared_1.PlayerState.Alive;
        state.phase = shared_1.GamePhase.Meeting;
        (0, vitest_1.expect)(vents.enter("killer", "vent-bridge")).toMatchObject({ success: false, reason: "Vent actions only allowed during playing phase" });
    });
    (0, vitest_1.it)("allows traversal only along bidirectional map connections", () => {
        vents.enter("killer", "vent-bridge");
        (0, vitest_1.expect)(vents.travel("killer", "vent-storage")).toMatchObject({
            success: false,
            reason: "Vent destination is not connected",
        });
        (0, vitest_1.expect)(vents.travel("killer", "vent-medbay")).toEqual({ success: true });
        (0, vitest_1.expect)(vents.getCurrentNodeId("killer")).toBe("vent-medbay");
        (0, vitest_1.expect)(vents.getConnectedNodeIds("killer")).toContain("vent-bridge");
    });
    (0, vitest_1.it)("exits at the authoritative current node and clears occupancy", () => {
        vents.enter("killer", "vent-bridge");
        vents.travel("killer", "vent-security");
        const node = shared_1.STARFALL_MAP.ventNodes.find((candidate) => candidate.id === "vent-security");
        (0, vitest_1.expect)(vents.exit("killer")).toEqual({ success: true });
        (0, vitest_1.expect)(state.players.get("killer")).toMatchObject({ x: node.x, y: node.y });
        (0, vitest_1.expect)(vents.isVenting("killer")).toBe(false);
    });
    (0, vitest_1.it)("clears occupancy safely for meetings, eliminations, and disconnects", () => {
        vents.enter("killer", "vent-bridge");
        vents.clearPlayer("killer");
        (0, vitest_1.expect)(vents.isVenting("killer")).toBe(false);
        vents.enter("killer", "vent-bridge");
        vents.clearAll();
        (0, vitest_1.expect)(vents.isVenting("killer")).toBe(false);
    });
});
