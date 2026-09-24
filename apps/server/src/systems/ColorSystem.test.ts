import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { ColorSystem } from "./ColorSystem";
import { COLORS, Color, PlayerState } from "@starfall/shared";

describe("ColorSystem", () => {
  let state: GameRoomState;
  let colorSystem: ColorSystem;

  beforeEach(() => {
    state = new GameRoomState();
    colorSystem = new ColorSystem(state);
  });

  it("returns empty used colors when no players", () => {
    const used = colorSystem.getUsedColors();
    expect(used.size).toBe(0);
  });

  it("tracks used colors from players", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    const player2 = new Player();
    player2.sessionId = "client-2";
    player2.color = "#0000FF";
    state.players.set("client-2", player2);

    const used = colorSystem.getUsedColors();
    expect(used.size).toBe(2);
    expect(used.has("#FF0000")).toBe(true);
    expect(used.has("#0000FF")).toBe(true);
  });

  it("returns first available color", () => {
    const available = colorSystem.getAvailableColor();
    expect(COLORS).toContain(available);
  });

  it("returns next available color when first is taken", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = COLORS[0];
    state.players.set("client-1", player1);

    const available = colorSystem.getAvailableColor();
    expect(available).toBe(COLORS[1]);
  });

  it("checks color availability correctly", () => {
    expect(colorSystem.isColorAvailable("#FF0000")).toBe(true);

    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    expect(colorSystem.isColorAvailable("#FF0000")).toBe(false);
    expect(colorSystem.isColorAvailable("#FF0000", "client-1")).toBe(true); // Exclude self
    expect(colorSystem.isColorAvailable("#0000FF")).toBe(true);
  });

  it("assigns requested color when available", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    const assigned = colorSystem.assignColor("client-1", "#0000FF");
    expect(assigned).toBe("#0000FF");

    const player = state.players.get("client-1");
    expect(player?.color).toBe("#0000FF");
  });

  it("rejects assignment of taken color", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    const player2 = new Player();
    player2.sessionId = "client-2";
    player2.color = "#0000FF";
    state.players.set("client-2", player2);

    const assigned = colorSystem.assignColor("client-1", "#0000FF");
    expect(assigned).toBeNull();
  });

  it("rejects assignment of unknown color", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    const assigned = colorSystem.assignColor("client-1", "#123456" as Color);
    expect(assigned).toBeNull();
  });

  it("auto-assigns available color when none requested", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    const assigned = colorSystem.assignColor("client-1");
    expect(assigned).toBe(COLORS[1]);
  });

  it("returns null for non-existent player", () => {
    const assigned = colorSystem.assignColor("non-existent", "#0000FF");
    expect(assigned).toBeNull();
  });

  it("returns all colors from catalog", () => {
    const allColors = colorSystem.getAllColors();
    expect(allColors).toEqual(COLORS);
    expect(allColors.length).toBe(21);
  });

  it("returns color availability map", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    const availability = colorSystem.getColorAvailability();
    expect(availability.size).toBe(COLORS.length);

    const redAvailability = availability.get("#FF0000");
    expect(redAvailability?.available).toBe(false);
    expect(redAvailability?.owner).toBe("client-1");

    const blueAvailability = availability.get("#0000FF");
    expect(blueAvailability?.available).toBe(true);
    expect(blueAvailability?.owner).toBeUndefined();
  });
});