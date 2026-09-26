"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobbySystem = void 0;
const shared_1 = require("@starfall/shared");
const ColorSystem_1 = require("./ColorSystem");
class LobbySystem {
    constructor(state) {
        this.state = state;
        this.colorSystem = new ColorSystem_1.ColorSystem(state);
    }
    /**
     * Check if the room is in lobby phase
     */
    isInLobby() {
        return this.state.phase === shared_1.GamePhase.Lobby;
    }
    /**
     * Get the minimum players required to start
     */
    getMinPlayers() {
        return shared_1.GAME_CONFIG.MIN_PLAYERS;
    }
    /**
     * Get the maximum players allowed
     */
    getMaxPlayers() {
        return shared_1.GAME_CONFIG.MAX_PLAYERS;
    }
    /**
     * Get current player count
     */
    getPlayerCount() {
        return this.state.players.size;
    }
    /**
     * Get alive player count
     */
    getAlivePlayerCount() {
        let count = 0;
        this.state.players.forEach((player) => {
            if (player.state === shared_1.PlayerState.Alive) {
                count++;
            }
        });
        return count;
    }
    /**
     * Check if a player can join (room not full, in lobby)
     */
    canJoin() {
        return this.isInLobby() && this.getPlayerCount() < this.getMaxPlayers();
    }
    /**
     * Set a player's ready status
     * Returns true if successful, false if not in lobby or player not found
     */
    setReady(sessionId, ready) {
        if (!this.isInLobby()) {
            return false;
        }
        const player = this.state.players.get(sessionId);
        if (!player) {
            return false;
        }
        player.ready = ready;
        return true;
    }
    /**
     * Get a player's ready status
     */
    getReady(sessionId) {
        const player = this.state.players.get(sessionId);
        if (!player) {
            return null;
        }
        return player.ready;
    }
    /**
     * Check if the game can start
     * Requirements: minimum players met, all players ready
     */
    canStart() {
        if (!this.isInLobby()) {
            return false;
        }
        const alivePlayers = this.getAlivePlayerCount();
        if (alivePlayers < this.getMinPlayers()) {
            return false;
        }
        // All alive players must be ready
        let allReady = true;
        this.state.players.forEach((player) => {
            if (player.state === shared_1.PlayerState.Alive && !player.ready) {
                allReady = false;
            }
        });
        return allReady;
    }
    /**
     * Get lobby state for synchronization
     */
    getLobbyState() {
        const players = [];
        this.state.players.forEach((player, sessionId) => {
            players.push({
                sessionId,
                name: player.name,
                color: player.color,
                ready: player.ready,
            });
        });
        return {
            players,
            minPlayers: this.getMinPlayers(),
            maxPlayers: this.getMaxPlayers(),
            canStart: this.canStart(),
        };
    }
    /**
     * Handle an already-authorized account joining and assign a unique color.
     */
    handlePlayerJoin(sessionId, accountId, displayName) {
        const player = this.state.createPlayer(sessionId, accountId, displayName, "#FF0000");
        this.state.players.set(sessionId, player);
        // Assign an available color
        this.colorSystem.assignColor(sessionId);
        return player.color;
    }
    /**
     * Handle player leaving - clean up
     */
    handlePlayerLeave(sessionId) {
        this.state.players.delete(sessionId);
    }
    /**
     * Handle color change request
     * Returns the new color if successful, null if failed
     */
    handleColorChange(sessionId, requestedColor) {
        if (!this.isInLobby()) {
            return null;
        }
        return this.colorSystem.assignColor(sessionId, requestedColor);
    }
    /**
     * Get the ColorSystem instance
     */
    getColorSystem() {
        return this.colorSystem;
    }
}
exports.LobbySystem = LobbySystem;
