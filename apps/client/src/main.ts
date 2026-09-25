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
  ColorChangeMessage,
  ReadyMessage,
  LobbyStateMessage,
  MatchStartMessage,
  RoleAssignmentMessage,
  COLORS,
} from "@starfall/shared";

// Types for Colyseus room state
interface PlayerData {
  sessionId: string;
  name: string;
  color: Color;
  state: PlayerState;
  x: number;
  y: number;
  lastInputTimestamp: number;
  ready: boolean;
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
  private myReady: boolean = false;
  private myRole: PlayerRole | null = null;
  private animationFrameId: number | null = null;
  private colorPickerUI: HTMLElement | null = null;
  private readyBtn: HTMLButtonElement | null = null;
  private startEligibilityEl: HTMLElement | null = null;
  private roleRevealUI: HTMLElement | null = null;
  private startMatchBtn: HTMLButtonElement | null = null;

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

  private createColorPickerUI() {
    if (this.colorPickerUI) return;

    this.colorPickerUI = document.createElement("div");
    this.colorPickerUI.id = "color-picker";
    this.colorPickerUI.style.cssText = `
      margin-top: 24px;
      padding: 16px;
      background: #1f2937;
      border-radius: 8px;
      border: 1px solid #374151;
    `;

    const colors = COLORS;
    const colorButtons = colors.map((color) => {
      const btn = document.createElement("button");
      btn.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid transparent;
        background: ${color};
        cursor: pointer;
        margin: 4px;
        transition: transform 0.1s, border-color 0.1s;
      `;
      btn.dataset.color = color;
      btn.title = color;
      btn.addEventListener("click", () => this.requestColorChange(color));
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "scale(1.1)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "scale(1)";
      });
      return btn;
    });

    this.colorPickerUI.innerHTML = `
      <h3 style="margin-bottom: 12px; font-size: 14px; color: #9ca3af;">Choose Color</h3>
      <div id="color-buttons" style="display: flex; flex-wrap: wrap; justify-content: center;"></div>
    `;

    const colorButtonsContainer =
      this.colorPickerUI.querySelector("#color-buttons")!;
    colorButtons.forEach((btn) => colorButtonsContainer.appendChild(btn));

    // Insert after players list
    this.playersList.appendChild(this.colorPickerUI);
  }

  private updateColorPickerUI(
    availableColors: Map<string, { available: boolean; owner?: string }>,
  ) {
    if (!this.colorPickerUI) return;

    const buttons =
      this.colorPickerUI.querySelectorAll<HTMLButtonElement>(
        "button[data-color]",
      );
    buttons.forEach((btn) => {
      const color = btn.dataset.color!;
      const availability = availableColors.get(color);
      const isMyColor = color === this.myColor;

      if (availability?.available || isMyColor) {
        btn.style.borderColor = isMyColor ? "#3b82f6" : "transparent";
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.disabled = false;
      } else {
        btn.style.borderColor = "#ef4444";
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
        btn.disabled = true;
      }

      // Highlight my color
      if (isMyColor) {
        btn.style.boxShadow = "0 0 0 2px #3b82f6";
      } else {
        btn.style.boxShadow = "none";
      }
    });
  }

  private createReadyButton() {
    if (this.readyBtn) return;

    this.readyBtn = document.createElement("button");
    this.readyBtn.id = "ready-btn";
    this.readyBtn.textContent = "Ready";
    this.readyBtn.style.cssText = `
      width: 100%;
      padding: 12px 24px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
    `;
    this.readyBtn.addEventListener("click", () => this.toggleReady());
    this.readyBtn.addEventListener("mouseenter", () => {
      this.readyBtn!.style.background = this.myReady ? "#ef4444" : "#059669";
    });
    this.readyBtn.addEventListener("mouseleave", () => {
      this.readyBtn!.style.background = this.myReady ? "#dc2626" : "#10b981";
    });

    this.startEligibilityEl = document.createElement("div");
    this.startEligibilityEl.id = "start-eligibility";
    this.startEligibilityEl.style.cssText = `
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      text-align: center;
    `;

    this.playersList.appendChild(this.readyBtn);
    this.playersList.appendChild(this.startEligibilityEl);
  }

  private createStartMatchButton() {
    if (this.startMatchBtn) return;

    this.startMatchBtn = document.createElement("button");
    this.startMatchBtn.id = "start-match-btn";
    this.startMatchBtn.textContent = "Start Match";
    this.startMatchBtn.style.cssText = `
      width: 100%;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
      display: none;
    `;
    this.startMatchBtn.addEventListener("click", () => this.requestMatchStart());
    this.startMatchBtn.addEventListener("mouseenter", () => {
      this.startMatchBtn!.style.background = "#2563eb";
    });
    this.startMatchBtn.addEventListener("mouseleave", () => {
      this.startMatchBtn!.style.background = "#3b82f6";
    });

    this.playersList.appendChild(this.startMatchBtn);
  }

  private updateReadyButton(ready: boolean, canStart: boolean) {
    this.myReady = ready;
    if (!this.readyBtn || !this.startEligibilityEl) return;

    this.readyBtn.textContent = ready ? "Unready" : "Ready";
    this.readyBtn.style.background = ready ? "#dc2626" : "#10b981";

    if (canStart) {
      this.startEligibilityEl.textContent =
        "All players ready - Game can start!";
      this.startEligibilityEl.style.background = "rgba(16, 185, 129, 0.2)";
      this.startEligibilityEl.style.color = "#10b981";
      // Show start match button
      if (this.startMatchBtn) {
        this.startMatchBtn.style.display = "block";
      }
    } else {
      this.startEligibilityEl.textContent =
        "Waiting for all players to ready up...";
      this.startEligibilityEl.style.background = "rgba(245, 158, 11, 0.2)";
      this.startEligibilityEl.style.color = "#f59e0b";
      // Hide start match button
      if (this.startMatchBtn) {
        this.startMatchBtn.style.display = "none";
      }
    }
  }

  private requestColorChange(color: Color) {
    if (!this.room) return;
    const message: ColorChangeMessage = { color };
    this.room.send(MESSAGE_TYPES.COLOR_CHANGE, message);
  }

  private toggleReady() {
    if (!this.room) return;
    const message: ReadyMessage = { ready: !this.myReady };
    this.room.send(MESSAGE_TYPES.READY, message);
  }

  private requestMatchStart() {
    if (!this.room) return;
    this.room.send(MESSAGE_TYPES.MATCH_START, {});
  }

  private showRoleReveal(role: PlayerRole) {
    // Remove existing role reveal UI if any
    if (this.roleRevealUI) {
      this.roleRevealUI.remove();
    }

    this.roleRevealUI = document.createElement("div");
    this.roleRevealUI.id = "role-reveal";
    this.roleRevealUI.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.5s ease-out;
    `;

    const isKiller = role === PlayerRole.Killer;
    const roleColor = isKiller ? "#ef4444" : "#10b981";
    const roleText = isKiller ? "KILLER" : "CREWMATE";
    const roleDescription = isKiller
      ? "Eliminate all crewmates without getting caught!"
      : "Complete tasks and find the killer!";

    this.roleRevealUI.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      </style>
      <div style="
        text-align: center;
        animation: pulse 2s ease-in-out infinite;
      ">
        <h1 style="
          font-size: 48px;
          font-weight: 800;
          color: ${roleColor};
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 4px;
        ">${roleText}</h1>
        <p style="
          font-size: 20px;
          color: #9ca3af;
          max-width: 600px;
        ">${roleDescription}</p>
      </div>
      <button id="role-reveal-continue" style="
        margin-top: 48px;
        padding: 16px 48px;
        background: ${roleColor};
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      ">Continue</button>
    `;

    document.body.appendChild(this.roleRevealUI);

    const continueBtn = document.getElementById("role-reveal-continue");
    continueBtn?.addEventListener("click", () => this.hideRoleReveal());
    continueBtn?.addEventListener("mouseenter", () => {
      if (continueBtn) continueBtn.style.background = isKiller ? "#dc2626" : "#059669";
      if (continueBtn) continueBtn.style.transform = "scale(1.02)";
    });
    continueBtn?.addEventListener("mouseleave", () => {
      if (continueBtn) continueBtn.style.background = roleColor;
      if (continueBtn) continueBtn.style.transform = "scale(1)";
    });
  }

  private hideRoleReveal() {
    if (this.roleRevealUI) {
      this.roleRevealUI.style.animation = "fadeOut 0.3s ease-in forwards";
      setTimeout(() => {
        if (this.roleRevealUI) {
          this.roleRevealUI.remove();
          this.roleRevealUI = null;
        }
      }, 300);
    }
    // Hide lobby UI and start game
    this.lobbyUI.classList.add("hidden");
    this.startInputSending();
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

      // Show lobby UI for lobby phase
      if (message.phase === GamePhase.Lobby) {
        this.lobbyUI.classList.remove("hidden");
        this.createColorPickerUI();
        this.createReadyButton();
        this.createStartMatchButton();
      } else if (message.phase === GamePhase.Playing) {
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

    this.room.onMessage(
      MESSAGE_TYPES.LOBBY_STATE,
      (message: LobbyStateMessage) => {
        console.log("Lobby state:", message);
        // Update color picker with availability
        const availability = new Map<
          string,
          { available: boolean; owner?: string }
        >();
        message.players.forEach((p) => {
          availability.set(p.color, { available: false, owner: p.sessionId });
        });
        // Mark colors not in use as available
        COLORS.forEach((color) => {
          if (!availability.has(color)) {
            availability.set(color, { available: true });
          }
        });
        this.updateColorPickerUI(availability);
        // Update ready button
        const myPlayer = message.players.find(
          (p) => p.sessionId === this.mySessionId,
        );
        if (myPlayer) {
          this.updateReadyButton(myPlayer.ready, message.canStart);
        }
      },
    );

    this.room.onMessage(MESSAGE_TYPES.COLOR_CHANGE, (message) => {
      console.log("Color changed:", message);
      if (message.sessionId === this.mySessionId) {
        this.myColor = message.color;
      }
      // The LOBBY_STATE message will follow with updated availability
    });

    this.room.onMessage(MESSAGE_TYPES.READY, (message) => {
      console.log("Ready changed:", message);
      // The LOBBY_STATE message will follow with updated ready status
    });

    this.room.onMessage(MESSAGE_TYPES.MATCH_START, (message: MatchStartMessage) => {
      console.log("Match started:", message);
      // Match is starting, roles will be assigned
    });

    this.room.onMessage(MESSAGE_TYPES.ROLE_ASSIGNMENT, (message: RoleAssignmentMessage) => {
      console.log("Role assigned:", message);
      this.myRole = message.role;
      this.showRoleReveal(message.role);
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
      this.hideRoleReveal();
      this.myRole = null;
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
        ${player.ready ? '<span class="player-ready" style="font-size: 12px; color: #10b981; background: rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 4px;">Ready</span>' : ""}
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
