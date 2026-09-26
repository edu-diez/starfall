import { beforeEach, describe, expect, it } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { VentSystem } from "./VentSystem";
import { RoleAssignmentSystem, type RandomSource } from "./RoleAssignmentSystem";
import { GamePhase, PlayerRole, PlayerState, STARFALL_MAP } from "@starfall/shared";

class FirstPlayerRandomSource implements RandomSource {
  random(): number {
    return 0.99;
  }

  shuffle<T>(items: T[]): T[] {
    return [...items];
  }
}

describe("VentSystem", () => {
  let state: GameRoomState;
  let roles: RoleAssignmentSystem;
  let vents: VentSystem;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Playing;
    roles = new RoleAssignmentSystem(state, new FirstPlayerRandomSource());
    vents = new VentSystem(state, roles);

    const killer = new Player();
    killer.sessionId = "killer";
    killer.state = PlayerState.Alive;
    killer.x = 960;
    killer.y = 150;
    state.players.set(killer.sessionId, killer);

    const crewmate = new Player();
    crewmate.sessionId = "crewmate";
    crewmate.state = PlayerState.Alive;
    crewmate.x = 200;
    crewmate.y = 375;
    state.players.set(crewmate.sessionId, crewmate);
    roles.assignRoles();
  });

  it("keeps vent occupancy private and allows only the Killer to enter", () => {
    expect(roles.getRole("killer")).toBe(PlayerRole.Killer);
    expect(vents.enter("crewmate", "vent-medbay")).toMatchObject({
      success: false,
      reason: "Only the Killer can use vents",
    });
    expect(vents.enter("killer", "vent-bridge")).toEqual({ success: true });
    expect(vents.isVenting("killer")).toBe(true);
    expect(Object.keys(state)).not.toContain("ventOccupants");
  });

  it("rejects distant, unknown, dead, and non-playing vent entry", () => {
    expect(vents.enter("killer", "unknown")).toMatchObject({ success: false, reason: "Unknown vent node" });
    expect(vents.enter("killer", "vent-medbay")).toMatchObject({ success: false, reason: "Vent is out of range" });

    state.players.get("killer")!.state = PlayerState.Dead;
    expect(vents.enter("killer", "vent-bridge")).toMatchObject({ success: false, reason: "Only living players can use vents" });

    state.players.get("killer")!.state = PlayerState.Alive;
    state.phase = GamePhase.Meeting;
    expect(vents.enter("killer", "vent-bridge")).toMatchObject({ success: false, reason: "Vent actions only allowed during playing phase" });
  });

  it("allows traversal only along bidirectional map connections", () => {
    vents.enter("killer", "vent-bridge");

    expect(vents.travel("killer", "vent-storage")).toMatchObject({
      success: false,
      reason: "Vent destination is not connected",
    });
    expect(vents.travel("killer", "vent-medbay")).toEqual({ success: true });
    expect(vents.getCurrentNodeId("killer")).toBe("vent-medbay");
    expect(vents.getConnectedNodeIds("killer")).toContain("vent-bridge");
  });

  it("exits at the authoritative current node and clears occupancy", () => {
    vents.enter("killer", "vent-bridge");
    vents.travel("killer", "vent-security");
    const node = STARFALL_MAP.ventNodes.find((candidate) => candidate.id === "vent-security")!;

    expect(vents.exit("killer")).toEqual({ success: true });
    expect(state.players.get("killer")).toMatchObject({ x: node.x, y: node.y });
    expect(vents.isVenting("killer")).toBe(false);
  });

  it("clears occupancy safely for meetings, eliminations, and disconnects", () => {
    vents.enter("killer", "vent-bridge");
    vents.clearPlayer("killer");
    expect(vents.isVenting("killer")).toBe(false);

    vents.enter("killer", "vent-bridge");
    vents.clearAll();
    expect(vents.isVenting("killer")).toBe(false);
  });
});
