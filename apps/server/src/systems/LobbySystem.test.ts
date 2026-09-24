import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { LobbySystem } from "./LobbySystem";
import { GamePhase, PlayerState, GAME_CONFIG, COLORS } from "@starfall/shared";

describe("LobbySystem", () => {
  let state: GameRoomState;
  let lobbySystem: LobbySystem;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Lobby;
    lobbySystem = new LobbySystem(state);
  });

  it("identifies lobby phase correctly", () => {
    expect(lobbySystem.isInLobby()).toBe(true);

    state.phase = GamePhase.Playing;
    expect(lobbySystem.isInLobby()).toBe(false);
  });

  it("returns correct min and max players", () => {
    expect(lobbySystem.getMinPlayers()).toBe(GAME_CONFIG.MIN_PLAYERS);
    expect(lobbySystem.getMaxPlayers()).toBe(GAME_CONFIG.MAX_PLAYERS);
  });

  it("tracks player count", () => {
    expect(lobbySystem.getPlayerCount()).toBe(0);

    const player1 = new Player();
    player1.sessionId = "client-1";
    state.players.set("client-1", player1);

    expect(lobbySystem.getPlayerCount()).toBe(1);
  });

  it("tracks alive player count", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.state = PlayerState.Alive;
    state.players.set("client-1", player1);

    const player2 = new Player();
    player2.sessionId = "client-2";
    player2.state = PlayerState.Dead;
    state.players.set("client-2", player2);

    expect(lobbySystem.getAlivePlayerCount()).toBe(1);
  });

  it("allows join when in lobby and not full", () => {
    expect(lobbySystem.canJoin()).toBe(true);

    // Fill the room
    for (let i = 0; i < GAME_CONFIG.MAX_PLAYERS; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      state.players.set(`client-${i}`, player);
    }
    expect(lobbySystem.canJoin()).toBe(false);
  });

  it("rejects join when not in lobby", () => {
    state.phase = GamePhase.Playing;
    expect(lobbySystem.canJoin()).toBe(false);
  });

  it("sets ready status in lobby", () => {
    const player = new Player();
    player.sessionId = "client-1";
    state.players.set("client-1", player);

    const result = lobbySystem.setReady("client-1", true);
    expect(result).toBe(true);

    const playerReady = state.players.get("client-1")?.ready;
    expect(playerReady).toBe(true);
  });

  it("rejects ready change when not in lobby", () => {
    state.phase = GamePhase.Playing;
    const player = new Player();
    player.sessionId = "client-1";
    state.players.set("client-1", player);

    const result = lobbySystem.setReady("client-1", true);
    expect(result).toBe(false);
  });

  it("rejects ready change for non-existent player", () => {
    const result = lobbySystem.setReady("non-existent", true);
    expect(result).toBe(false);
  });

  it("gets ready status", () => {
    const player = new Player();
    player.sessionId = "client-1";
    player.ready = true;
    state.players.set("client-1", player);

    expect(lobbySystem.getReady("client-1")).toBe(true);
    expect(lobbySystem.getReady("non-existent")).toBeNull();
  });

  it("calculates canStart with minimum players and all ready", () => {
    // Add minimum players
    for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      state.players.set(`client-${i}`, player);
    }

    // Not all ready
    expect(lobbySystem.canStart()).toBe(false);

    // All ready
    state.players.forEach((player) => {
      player.ready = true;
    });
    expect(lobbySystem.canStart()).toBe(true);
  });

  it("requires minimum players to start", () => {
    // Add only 3 players (min is 4)
    for (let i = 0; i < 3; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      player.ready = true;
      state.players.set(`client-${i}`, player);
    }

    expect(lobbySystem.canStart()).toBe(false);
  });

  it("handles dead players in canStart calculation", () => {
    // Add 4 players but one is dead
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = i === 3 ? PlayerState.Dead : PlayerState.Alive;
      player.ready = true;
      state.players.set(`client-${i}`, player);
    }

    // Only 3 alive players, need 4
    expect(lobbySystem.canStart()).toBe(false);
  });

  it("handles player join with color assignment", () => {
    const color = lobbySystem.handlePlayerJoin("client-1", "TestPlayer");
    expect(COLORS).toContain(color);

    const player = state.players.get("client-1");
    expect(player?.name).toBe("TestPlayer");
    expect(player?.color).toBe(color);
  });

  it("handles player leave", () => {
    const player = new Player();
    player.sessionId = "client-1";
    state.players.set("client-1", player);

    lobbySystem.handlePlayerLeave("client-1");
    expect(state.players.size).toBe(0);
  });

  it("handles color change in lobby", () => {
    const player = new Player();
    player.sessionId = "client-1";
    player.color = "#FF0000";
    state.players.set("client-1", player);

    const newColor = lobbySystem.handleColorChange("client-1", "#0000FF");
    expect(newColor).toBe("#0000FF");

    const updatedPlayer = state.players.get("client-1");
    expect(updatedPlayer?.color).toBe("#0000FF");
  });

  it("rejects color change when not in lobby", () => {
    state.phase = GamePhase.Playing;
    const player = new Player();
    player.sessionId = "client-1";
    player.color = "#FF0000";
    state.players.set("client-1", player);

    const newColor = lobbySystem.handleColorChange("client-1", "#0000FF");
    expect(newColor).toBeNull();
  });

  it("rejects color change to taken color", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.color = "#FF0000";
    state.players.set("client-1", player1);

    const player2 = new Player();
    player2.sessionId = "client-2";
    player2.color = "#0000FF";
    state.players.set("client-2", player2);

    const newColor = lobbySystem.handleColorChange("client-1", "#0000FF");
    expect(newColor).toBeNull();
  });

  it("returns lobby state for synchronization", () => {
    const player1 = new Player();
    player1.sessionId = "client-1";
    player1.name = "Player1";
    player1.color = "#FF0000";
    player1.ready = true;
    state.players.set("client-1", player1);

    const player2 = new Player();
    player2.sessionId = "client-2";
    player2.name = "Player2";
    player2.color = "#0000FF";
    player2.ready = false;
    state.players.set("client-2", player2);

    const lobbyState = lobbySystem.getLobbyState();
    expect(lobbyState.players.length).toBe(2);
    expect(lobbyState.minPlayers).toBe(GAME_CONFIG.MIN_PLAYERS);
    expect(lobbyState.maxPlayers).toBe(GAME_CONFIG.MAX_PLAYERS);
    expect(lobbyState.canStart).toBe(false); // Not all ready
  });
});