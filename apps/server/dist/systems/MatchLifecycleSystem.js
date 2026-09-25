"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchLifecycleSystem = void 0;
const shared_1 = require("@starfall/shared");
class MatchLifecycleSystem {
    state;
    lobbySystem;
    matchId = 0;
    constructor(state, lobbySystem) {
        this.state = state;
        this.lobbySystem = lobbySystem;
    }
    /**
     * Get the current match ID
     */
    getMatchId() {
        return this.matchId;
    }
    /**
     * Check if the room is in a valid phase for match start
     */
    canStartMatch() {
        return this.lobbySystem.canStart();
    }
    /**
     * Start the match - transitions from Lobby to AssigningRoles
     * Returns true if successful, false if not in lobby or requirements not met
     */
    startMatch() {
        if (!this.canStartMatch()) {
            return false;
        }
        // Transition to AssigningRoles phase
        this.state.phase = shared_1.GamePhase.AssigningRoles;
        this.matchId++;
        this.state.matchStartTime = Date.now();
        return true;
    }
    /**
     * Complete role assignment and transition to Playing phase
     */
    completeRoleAssignment() {
        if (this.state.phase !== shared_1.GamePhase.AssigningRoles) {
            return;
        }
        this.state.phase = shared_1.GamePhase.Playing;
    }
    /**
     * End the match and transition to GameOver phase
     */
    endMatch() {
        this.state.phase = shared_1.GamePhase.GameOver;
    }
    /**
     * Reset the match for a new game (administrative reset)
     * Returns to Lobby phase
     */
    resetMatch() {
        this.state.phase = shared_1.GamePhase.Lobby;
        this.state.matchStartTime = 0;
        this.state.meetingEndTime = 0;
        // Reset all players to alive and unready
        this.state.players.forEach((player) => {
            player.state = shared_1.PlayerState.Alive;
            player.ready = false;
            player.x = shared_1.GAME_CONFIG.MAP_WIDTH / 2;
            player.y = shared_1.GAME_CONFIG.MAP_HEIGHT / 2;
        });
    }
    /**
     * Get the current phase
     */
    getPhase() {
        return this.state.phase;
    }
    /**
     * Check if the match is in progress (playing or meeting)
     */
    isMatchInProgress() {
        return (this.state.phase === shared_1.GamePhase.Playing ||
            this.state.phase === shared_1.GamePhase.Meeting);
    }
    /**
     * Check if roles are being assigned
     */
    isAssigningRoles() {
        return this.state.phase === shared_1.GamePhase.AssigningRoles;
    }
    /**
     * Check if in lobby
     */
    isInLobby() {
        return this.state.phase === shared_1.GamePhase.Lobby;
    }
    /**
     * Check if game is over
     */
    isGameOver() {
        return this.state.phase === shared_1.GamePhase.GameOver;
    }
}
exports.MatchLifecycleSystem = MatchLifecycleSystem;
