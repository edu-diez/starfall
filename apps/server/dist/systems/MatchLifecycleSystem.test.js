"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const MatchLifecycleSystem_1 = require("./MatchLifecycleSystem");
const LobbySystem_1 = require("./LobbySystem");
const shared_1 = require("@starfall/shared");
(0, vitest_1.describe)("MatchLifecycleSystem", () => {
    let state;
    let lobbySystem;
    let matchLifecycleSystem;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Lobby;
        lobbySystem = new LobbySystem_1.LobbySystem(state);
        matchLifecycleSystem = new MatchLifecycleSystem_1.MatchLifecycleSystem(state, lobbySystem);
    });
    (0, vitest_1.it)("initializes with matchId 0", () => {
        (0, vitest_1.expect)(matchLifecycleSystem.getMatchId()).toBe(0);
    });
    (0, vitest_1.it)("identifies lobby phase correctly", () => {
        (0, vitest_1.expect)(matchLifecycleSystem.isInLobby()).toBe(true);
        (0, vitest_1.expect)(matchLifecycleSystem.isAssigningRoles()).toBe(false);
        (0, vitest_1.expect)(matchLifecycleSystem.isMatchInProgress()).toBe(false);
        (0, vitest_1.expect)(matchLifecycleSystem.isGameOver()).toBe(false);
    });
    (0, vitest_1.it)("canStartMatch returns false when lobby requirements not met", () => {
        (0, vitest_1.expect)(matchLifecycleSystem.canStartMatch()).toBe(false);
    });
    (0, vitest_1.it)("canStartMatch returns true when lobby requirements met", () => {
        // Add minimum players
        for (let i = 0; i < shared_1.GAME_CONFIG.MIN_PLAYERS; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            player.ready = true;
            state.players.set(`client-${i}`, player);
        }
        (0, vitest_1.expect)(matchLifecycleSystem.canStartMatch()).toBe(true);
    });
    (0, vitest_1.it)("startMatch transitions to AssigningRoles phase", () => {
        // Add minimum players
        for (let i = 0; i < shared_1.GAME_CONFIG.MIN_PLAYERS; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            player.ready = true;
            state.players.set(`client-${i}`, player);
        }
        const result = matchLifecycleSystem.startMatch();
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.AssigningRoles);
        (0, vitest_1.expect)(matchLifecycleSystem.getMatchId()).toBe(1);
        (0, vitest_1.expect)(state.matchStartTime).toBeGreaterThan(0);
        (0, vitest_1.expect)(matchLifecycleSystem.isAssigningRoles()).toBe(true);
    });
    (0, vitest_1.it)("startMatch fails when not in lobby", () => {
        state.phase = shared_1.GamePhase.Playing;
        const result = matchLifecycleSystem.startMatch();
        (0, vitest_1.expect)(result).toBe(false);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Playing);
    });
    (0, vitest_1.it)("startMatch fails when minimum players not met", () => {
        // Only 2 players, need 4
        for (let i = 0; i < 2; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            player.ready = true;
            state.players.set(`client-${i}`, player);
        }
        const result = matchLifecycleSystem.startMatch();
        (0, vitest_1.expect)(result).toBe(false);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Lobby);
    });
    (0, vitest_1.it)("startMatch fails when not all players ready", () => {
        for (let i = 0; i < shared_1.GAME_CONFIG.MIN_PLAYERS; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            player.ready = i < shared_1.GAME_CONFIG.MIN_PLAYERS - 1; // Last player not ready
            state.players.set(`client-${i}`, player);
        }
        const result = matchLifecycleSystem.startMatch();
        (0, vitest_1.expect)(result).toBe(false);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Lobby);
    });
    (0, vitest_1.it)("completeRoleAssignment transitions to Playing phase", () => {
        state.phase = shared_1.GamePhase.AssigningRoles;
        matchLifecycleSystem.completeRoleAssignment();
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Playing);
        (0, vitest_1.expect)(matchLifecycleSystem.isMatchInProgress()).toBe(true);
    });
    (0, vitest_1.it)("completeRoleAssignment does nothing if not in AssigningRoles", () => {
        state.phase = shared_1.GamePhase.Lobby;
        matchLifecycleSystem.completeRoleAssignment();
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Lobby);
    });
    (0, vitest_1.it)("transitions through voting and returns to playing", () => {
        state.phase = shared_1.GamePhase.Meeting;
        (0, vitest_1.expect)(matchLifecycleSystem.startVoting()).toBe(true);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Voting);
        (0, vitest_1.expect)(matchLifecycleSystem.startVoteResolution()).toBe(true);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.ResolvingVote);
        (0, vitest_1.expect)(matchLifecycleSystem.resumePlayingAfterVote()).toBe(true);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Playing);
    });
    (0, vitest_1.it)("rejects invalid voting transitions", () => {
        (0, vitest_1.expect)(matchLifecycleSystem.startVoting()).toBe(false);
        state.phase = shared_1.GamePhase.Playing;
        (0, vitest_1.expect)(matchLifecycleSystem.startVoteResolution()).toBe(false);
        (0, vitest_1.expect)(matchLifecycleSystem.resumePlayingAfterVote()).toBe(false);
    });
    (0, vitest_1.it)("endMatch transitions to GameOver phase", () => {
        state.phase = shared_1.GamePhase.Playing;
        matchLifecycleSystem.endMatch();
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.GameOver);
        (0, vitest_1.expect)(matchLifecycleSystem.isGameOver()).toBe(true);
    });
    (0, vitest_1.it)("resetMatch returns to Lobby phase and resets players", () => {
        // Set up a match in progress
        state.phase = shared_1.GamePhase.Playing;
        state.matchStartTime = Date.now();
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        player.state = shared_1.PlayerState.Dead;
        player.ready = true;
        player.x = 100;
        player.y = 200;
        state.players.set("client-1", player);
        matchLifecycleSystem.resetMatch();
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Lobby);
        (0, vitest_1.expect)(state.matchStartTime).toBe(0);
        (0, vitest_1.expect)(state.meetingEndTime).toBe(0);
        (0, vitest_1.expect)(player.state).toBe(shared_1.PlayerState.Alive);
        (0, vitest_1.expect)(player.ready).toBe(false);
        (0, vitest_1.expect)(player.x).toBe(shared_1.GAME_CONFIG.MAP_WIDTH / 2);
        (0, vitest_1.expect)(player.y).toBe(shared_1.GAME_CONFIG.MAP_HEIGHT / 2);
    });
    (0, vitest_1.it)("increments matchId on each startMatch", () => {
        for (let i = 0; i < shared_1.GAME_CONFIG.MIN_PLAYERS; i++) {
            const player = new GameRoomState_1.Player();
            player.sessionId = `client-${i}`;
            player.state = shared_1.PlayerState.Alive;
            player.ready = true;
            state.players.set(`client-${i}`, player);
        }
        matchLifecycleSystem.startMatch();
        (0, vitest_1.expect)(matchLifecycleSystem.getMatchId()).toBe(1);
        matchLifecycleSystem.resetMatch();
        // Re-ready players after reset
        state.players.forEach((player) => {
            player.ready = true;
        });
        matchLifecycleSystem.startMatch();
        (0, vitest_1.expect)(matchLifecycleSystem.getMatchId()).toBe(2);
    });
});
