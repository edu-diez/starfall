import { Client } from "colyseus.js";
import { PlayerState, GAME_CONFIG } from "@starfall/shared";
// Game client class
class GameClient {
    client;
    room = null;
    canvas;
    ctx;
    connectionStatus;
    lobbyUI;
    joinBtn;
    playerNameInput;
    playersContainer;
    playersList;
    mySessionId = null;
    myColor = "#FF0000";
    animationFrameId = null;
    constructor() {
        this.client = new Client("ws://localhost:2567");
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.connectionStatus = document.getElementById("connection-status");
        this.lobbyUI = document.getElementById("lobby-ui");
        this.joinBtn = document.getElementById("join-btn");
        this.playerNameInput = document.getElementById("player-name");
        this.playersContainer = document.getElementById("players-container");
        this.playersList = document.getElementById("players-list");
        this.setupCanvas();
        this.setupEventListeners();
        this.connect();
    }
    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);
    }
    setupEventListeners() {
        this.playerNameInput.addEventListener("input", () => {
            this.joinBtn.disabled = this.playerNameInput.value.trim().length === 0;
        });
        this.joinBtn.addEventListener("click", () => {
            const name = this.playerNameInput.value.trim();
            if (name && this.room) {
                this.room.send("join", { name });
                this.joinBtn.disabled = true;
                this.playerNameInput.disabled = true;
            }
        });
        this.playerNameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !this.joinBtn.disabled) {
                this.joinBtn.click();
            }
        });
    }
    async connect() {
        try {
            this.updateConnectionStatus("Connecting...", "status-connecting");
            this.room = await this.client.joinOrCreate("game", {});
            this.setupRoomListeners();
            this.updateConnectionStatus("Connected", "status-connected");
        }
        catch (error) {
            console.error("Connection failed:", error);
            this.updateConnectionStatus("Connection Failed", "status-error");
        }
    }
    setupRoomListeners() {
        if (!this.room)
            return;
        this.room.onStateChange((state) => {
            this.renderPlayersList(state.players);
        });
        this.room.onMessage("welcome", (message) => {
            this.mySessionId = message.sessionId;
            this.myColor = message.color;
            console.log("Welcome:", message);
        });
        this.room.onMessage("playerJoined", (message) => {
            console.log("Player joined:", message);
        });
        this.room.onMessage("playerLeft", (message) => {
            console.log("Player left:", message);
        });
        this.room.onMessage("error", (message) => {
            console.error("Server error:", message);
            this.updateConnectionStatus(`Error: ${message.message}`, "status-error");
            this.joinBtn.disabled = false;
            this.playerNameInput.disabled = false;
        });
        this.room.onLeave((code) => {
            console.log("Left room:", code);
            this.updateConnectionStatus("Disconnected", "status-disconnected");
            this.lobbyUI.classList.remove("hidden");
        });
        this.room.onError((code, message) => {
            console.error("Room error:", code, message);
            this.updateConnectionStatus(`Error: ${message}`, "status-error");
        });
    }
    updateConnectionStatus(text, className) {
        this.connectionStatus.textContent = text;
        this.connectionStatus.className = className;
    }
    renderPlayersList(players) {
        this.playersContainer.innerHTML = "";
        let count = 0;
        players.forEach((player, sessionId) => {
            count++;
            const div = document.createElement("div");
            div.className = "player-item";
            div.innerHTML = `
        <div class="player-color" style="background: ${player.color}"></div>
        <span class="player-name">${player.name}</span>
        ${sessionId === this.mySessionId ? '<span class="player-you">You</span>' : ''}
      `;
            this.playersContainer.appendChild(div);
        });
        const playersListHeader = this.playersList.querySelector("h3");
        if (playersListHeader) {
            playersListHeader.textContent = `Players (${count}/${GAME_CONFIG.MAX_PLAYERS})`;
        }
    }
    gameLoop = () => {
        this.render();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };
    render() {
        // Clear canvas
        this.ctx.fillStyle = "#0f0f1a";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw grid background
        this.drawGrid();
        // Draw players if in game
        if (this.room?.state) {
            this.room.state.players.forEach((player) => {
                this.drawPlayer(player);
            });
        }
    }
    drawGrid() {
        const gridSize = 50;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    drawPlayer(player) {
        if (player.state !== PlayerState.Alive)
            return;
        const screenX = (player.x / GAME_CONFIG.MAP_WIDTH) * this.canvas.width;
        const screenY = (player.y / GAME_CONFIG.MAP_HEIGHT) * this.canvas.height;
        const radius = (GAME_CONFIG.PLAYER_RADIUS / GAME_CONFIG.MAP_WIDTH) * this.canvas.width;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = player.color;
        this.ctx.fill();
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        // Draw name
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "12px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(player.name, screenX, screenY - radius - 8);
    }
    start() {
        this.gameLoop();
    }
}
// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const game = new GameClient();
    game.start();
});
