import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { MatchLifecycleSystem } from "./MatchLifecycleSystem";
import { LobbySystem } from "./LobbySystem";
import { GamePhase, PlayerState, GAME_CONFIG } from "@starfall/shared";

describe("MatchLifecycleSystem", () => {
  let state: GameRoomState;
  let lobbySystem: LobbySystem;
  let matchLifecycleSystem: MatchLifecycleSystem;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Lobby;
    lobbySystem = new LobbySystem(state);
    matchLifecycleSystem = new MatchLifecycleSystem(state, lobbySystem);
  });

  it("initializes with matchId 0", () => {
    expect(matchLifecycleSystem.getMatchId()).toBe(0);
  });

  it("identifies lobby phase correctly", () => {
    expect(matchLifecycleSystem.isInLobby()).toBe(true);
    expect(matchLifecycleSystem.isAssigningRoles()).toBe(false);
    expect(matchLifecycleSystem.isMatchInProgress()).toBe(false);
    expect(matchLifecycleSystem.isGameOver()).toBe(false);
  });

  it("canStartMatch returns false when lobby requirements not met", () => {
    expect(matchLifecycleSystem.canStartMatch()).toBe(false);
  });

  it("canStartMatch returns true when lobby requirements met", () => {
    // Add minimum players
    for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      player.ready = true;
      state.players.set(`client-${i}`, player);
    }

    expect(matchLifecycleSystem.canStartMatch()).toBe(true);
  });

  it("startMatch transitions to AssigningRoles phase", () => {
    // Add minimum players
    for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      player.ready = true;
      state.players.set(`client-${i}`, player);
    }

    const result = matchLifecycleSystem.startMatch();
    expect(result).toBe(true);
    expect(state.phase).toBe(GamePhase.AssigningRoles);
    expect(matchLifecycleSystem.getMatchId()).toBe(1);
    expect(state.matchStartTime).toBeGreaterThan(0);
    expect(matchLifecycleSystem.isAssigningRoles()).toBe(true);
  });

  it("startMatch fails when not in lobby", () => {
    state.phase = GamePhase.Playing;
    const result = matchLifecycleSystem.startMatch();
    expect(result).toBe(false);
    expect(state.phase).toBe(GamePhase.Playing);
  });

  it("startMatch fails when minimum players not met", () => {
    // Only 2 players, need 4
    for (let i = 0; i < 2; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      player.ready = true;
      state.players.set(`client-${i}`, player);
    }

    const result = matchLifecycleSystem.startMatch();
    expect(result).toBe(false);
    expect(state.phase).toBe(GamePhase.Lobby);
  });

  it("startMatch fails when not all players ready", () => {
    for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      player.ready = i < GAME_CONFIG.MIN_PLAYERS - 1; // Last player not ready
      state.players.set(`client-${i}`, player);
    }

    const result = matchLifecycleSystem.startMatch();
    expect(result).toBe(false);
    expect(state.phase).toBe(GamePhase.Lobby);
  });

  it("completeRoleAssignment transitions to Playing phase", () => {
    state.phase = GamePhase.AssigningRoles;
    matchLifecycleSystem.completeRoleAssignment();
    expect(state.phase).toBe(GamePhase.Playing);
    expect(matchLifecycleSystem.isMatchInProgress()).toBe(true);
  });

  it("completeRoleAssignment does nothing if not in AssigningRoles", () => {
    state.phase = GamePhase.Lobby;
    matchLifecycleSystem.completeRoleAssignment();
    expect(state.phase).toBe(GamePhase.Lobby);
  });

  it("endMatch transitions to GameOver phase", () => {
    state.phase = GamePhase.Playing;
    matchLifecycleSystem.endMatch();
    expect(state.phase).toBe(GamePhase.GameOver);
    expect(matchLifecycleSystem.isGameOver()).toBe(true);
  });

  it("resetMatch returns to Lobby phase and resets players", () => {
    // Set up a match in progress
    state.phase = GamePhase.Playing;
    state.matchStartTime = Date.now();
    
    const player = new Player();
    player.sessionId = "client-1";
    player.state = PlayerState.Dead;
    player.ready = true;
    player.x = 100;
    player.y = 200;
    state.players.set("client-1", player);

    matchLifecycleSystem.resetMatch();

    expect(state.phase).toBe(GamePhase.Lobby);
    expect(state.matchStartTime).toBe(0);
    expect(state.meetingEndTime).toBe(0);
    expect(player.state).toBe(PlayerState.Alive);
    expect(player.ready).toBe(false);
    expect(player.x).toBe(GAME_CONFIG.MAP_WIDTH / 2);
    expect(player.y).toBe(GAME_CONFIG.MAP_HEIGHT / 2);
  });

  it("increments matchId on each startMatch", () => {
    for (let i = 0; i < GAME_CONFIG.MIN_PLAYERS; i++) {
      const player = new Player();
      player.sessionId = `client-${i}`;
      player.state = PlayerState.Alive;
      player.ready = true;
      state.players.set(`client-${i}`, player);
    }

    matchLifecycleSystem.startMatch();
    expect(matchLifecycleSystem.getMatchId()).toBe(1);

    matchLifecycleSystem.resetMatch();
    // Re-ready players after reset
    state.players.forEach((player) => {
      player.ready = true;
    });
    matchLifecycleSystem.startMatch();
    expect(matchLifecycleSystem.getMatchId()).toBe(2);
  });
});