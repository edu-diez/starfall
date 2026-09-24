import { Client, Room } from "colyseus.js";
import {
  GamePhase,
  PlayerRole,
  PlayerState,
  Color,
  GAME_CONFIG,
  Vec2,
  MESSAGE_TYPES,
  MoveMessage,
} from "@starfall/shared";

// Types for Colyseus room state
interface PlayerData {
  sessionId: string;
  name: string;
  color: Color;
  role: PlayerRole;
  state: PlayerState;
  x: number;
  y: number;
  lastInputTimestamp: number;
}

interface GameRoomState {
  players: Map<string, PlayerData>;
  phase: GamePhase;
  matchStartTime: number;
  meetingEndTime: number;
}

// Game client class
class GameClient {
  private client: Client;
  private room: Room<GameRoomState> | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private connectionStatus: HTMLElement;
  private lobbyUI: HTMLElement;
  private joinBtn: HTMLButtonElement;
  private playerNameInput: HTMLInputElement;
  private playersContainer: HTMLElement;
  private playersList: HTMLElement;
  private mySessionId: string | null = null;
  private myColor: Color = "#FF0000";
  private animationFrameId: number | null = null;

  // Input state
  private keysPressed = new Set<string>();
  private lastSentInput: Vec2 = { x: 0, y: 0 };
  private inputSendInterval: number | null = null;
  private readonly INPUT_SEND_RATE = 60; // Hz - match server tick rate

  constructor() {
    this.client = new Client("ws://localhost:2567");
    this.canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.connectionStatus = document.getElementById("connection-status")!;
    this.lobbyUI = document.getElementById("lobby-ui")!;
    this.joinBtn = document.getElementById("join-btn") as HTMLButtonElement;
    this.playerNameInput = document.getElementById(
      "player-name",
    ) as HTMLInputElement;
    this.playersContainer = document.getElementById("players-container")!;
    this.playersList = document.getElementById("players-list")!;

    this.setupCanvas();
    this.setupEventListeners();
    this.connect();
  }

  private setupCanvas() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
  }

  private setupEventListeners() {
    this.playerNameInput.addEventListener("input", () => {
      this.joinBtn.disabled = this.playerNameInput.value.trim().length === 0;
    });

    this.joinBtn.addEventListener("click", () => {
      const name = this.playerNameInput.value.trim();
      if (name && this.room) {
        this.room.send(MESSAGE_TYPES.JOIN, { name });
        this.joinBtn.disabled = true;
        this.playerNameInput.disabled = true;
      }
    });

    this.playerNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !this.joinBtn.disabled) {
        this.joinBtn.click();
      }
    });

    // Keyboard input for movement
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Prevent default for game keys
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
        "W",
        "A",
        "S",
        "D",
      ].includes(e.key)
    ) {
      e.preventDefault();
    }
    this.keysPressed.add(e.key.toLowerCase());
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keysPressed.delete(e.key.toLowerCase());
  }

  private getInputDirection(): Vec2 {
    let x = 0;
    let y = 0;

    if (this.keysPressed.has("arrowup") || this.keysPressed.has("w")) {
      y -= 1;
    }
    if (this.keysPressed.has("arrowdown") || this.keysPressed.has("s")) {
      y += 1;
    }
    if (this.keysPressed.has("arrowleft") || this.keysPressed.has("a")) {
      x -= 1;
    }
    if (this.keysPressed.has("arrowright") || this.keysPressed.has("d")) {
      x += 1;
    }

    return { x, y };
  }

  private async connect() {
    try {
      this.updateConnectionStatus("Connecting...", "status-connecting");
      this.room = await this.client.joinOrCreate<GameRoomState>("game", {});
      this.setupRoomListeners();
      this.updateConnectionStatus("Connected", "status-connected");
    } catch (error) {
      console.error("Connection failed:", error);
      this.updateConnectionStatus("Connection Failed", "status-error");
    }
  }

  private setupRoomListeners() {
    if (!this.room) return;

    this.room.onStateChange((state) => {
      this.renderPlayersList(state.players);
    });

    this.room.onMessage(MESSAGE_TYPES.WELCOME, (message) => {
      this.mySessionId = message.sessionId;
      this.myColor = message.color;
      console.log("Welcome:", message);

      // Hide lobby UI and start input sending when joined
      if (message.phase === GamePhase.Playing) {
        this.lobbyUI.classList.add("hidden");
        this.startInputSending();
      }
    });

    this.room.onMessage(MESSAGE_TYPES.PLAYER_JOINED, (message) => {
      console.log("Player joined:", message);
    });

    this.room.onMessage(MESSAGE_TYPES.PLAYER_LEFT, (message) => {
      console.log("Player left:", message);
    });

    this.room.onMessage(MESSAGE_TYPES.ERROR, (message) => {
      console.error("Server error:", message);
      this.updateConnectionStatus(`Error: ${message.message}`, "status-error");
      this.joinBtn.disabled = false;
      this.playerNameInput.disabled = false;
    });

    this.room.onLeave((code) => {
      console.log("Left room:", code);
      this.updateConnectionStatus("Disconnected", "status-disconnected");
      this.lobbyUI.classList.remove("hidden");
      this.stopInputSending();
    });

    this.room.onError((code, message) => {
      console.error("Room error:", code, message);
      this.updateConnectionStatus(`Error: ${message}`, "status-error");
    });
  }

  private startInputSending() {
    if (this.inputSendInterval) return;

    this.inputSendInterval = window.setInterval(() => {
      this.sendMovementInput();
    }, 1000 / this.INPUT_SEND_RATE);
  }

  private stopInputSending() {
    if (this.inputSendInterval) {
      clearInterval(this.inputSendInterval);
      this.inputSendInterval = null;
    }
  }

  private sendMovementInput() {
    if (!this.room || !this.mySessionId) return;

    const direction = this.getInputDirection();

    // Only send if input changed (optimization)
    if (
      direction.x === this.lastSentInput.x &&
      direction.y === this.lastSentInput.y
    ) {
      return;
    }

    this.lastSentInput = direction;

    const message: MoveMessage = {
      direction,
      timestamp: Date.now(),
    };

    this.room.send(MESSAGE_TYPES.MOVE, message);
  }

  private updateConnectionStatus(text: string, className: string) {
    this.connectionStatus.textContent = text;
    this.connectionStatus.className = className;
  }

  private renderPlayersList(players: Map<string, PlayerData>) {
    this.playersContainer.innerHTML = "";
    let count = 0;
    players.forEach((player, sessionId) => {
      count++;
      const div = document.createElement("div");
      div.className = "player-item";
      div.innerHTML = `
        <div class="player-color" style="background: ${player.color}"></div>
        <span class="player-name">${player.name}</span>
        ${sessionId === this.mySessionId ? '<span class="player-you">You</span>' : ""}
      `;
      this.playersContainer.appendChild(div);
    });
    const playersListHeader = this.playersList.querySelector("h3");
    if (playersListHeader) {
      playersListHeader.textContent = `Players (${count}/${GAME_CONFIG.MAX_PLAYERS})`;
    }
  }

  private gameLoop = () => {
    this.render();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private render() {
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

  private drawGrid() {
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

  private drawPlayer(player: PlayerData) {
    if (player.state !== PlayerState.Alive) return;

    const screenX = (player.x / GAME_CONFIG.MAP_WIDTH) * this.canvas.width;
    const screenY = (player.y / GAME_CONFIG.MAP_HEIGHT) * this.canvas.height;
    const radius =
      (GAME_CONFIG.PLAYER_RADIUS / GAME_CONFIG.MAP_WIDTH) * this.canvas.width;

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

  public start() {
    this.gameLoop();
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const game = new GameClient();
  game.start();
});
