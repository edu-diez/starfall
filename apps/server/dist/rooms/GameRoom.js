"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const colyseus_1 = require("colyseus");
const GameRoomState_1 = require("./schema/GameRoomState");
const shared_1 = require("@amongus/shared");
class GameRoom extends colyseus_1.Room {
    maxClients = shared_1.GAME_CONFIG.MAX_PLAYERS;
    onCreate(options) {
        this.setState(new GameRoomState_1.GameRoomState());
        this.state.phase = shared_1.GamePhase.Lobby;
        this.onMessage("join", (client, message) => {
            this.handleJoin(client, message);
        });
        this.onMessage("leave", (client) => {
            this.handleLeave(client);
        });
    }
    onJoin(client, options) {
        console.log(`Client ${client.sessionId} joined`);
    }
    onLeave(client, consented) {
        console.log(`Client ${client.sessionId} left`);
        this.handleLeave(client);
    }
    onDispose() {
        console.log("Room disposed");
    }
    handleJoin(client, message) {
        const playerName = message?.name || `Player ${client.sessionId.slice(0, 4)}`;
        // Check if player already exists
        if (this.state.players.has(client.sessionId)) {
            return;
        }
        // Check max players
        if (this.state.players.size >= this.maxClients) {
            client.send("error", { message: "Room is full" });
            return;
        }
        // Assign a color
        const usedColors = new Set();
        this.state.players.forEach((player) => usedColors.add(player.color));
        let assignedColor = "#FF0000";
        for (const color of shared_1.COLORS) {
            if (!usedColors.has(color)) {
                assignedColor = color;
                break;
            }
        }
        // Create player
        const player = this.state.createPlayer(client.sessionId, playerName, assignedColor);
        this.state.players.set(client.sessionId, player);
        // Send welcome message with private role (will be assigned later)
        client.send("welcome", {
            sessionId: client.sessionId,
            playerId: client.sessionId,
            color: assignedColor,
            phase: this.state.phase,
        });
        // Broadcast player joined to others
        this.broadcast("playerJoined", {
            sessionId: client.sessionId,
            name: playerName,
            color: assignedColor,
        }, { except: client });
    }
    handleLeave(client) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
            this.state.players.delete(client.sessionId);
            this.broadcast("playerLeft", { sessionId: client.sessionId });
        }
    }
}
exports.GameRoom = GameRoom;
