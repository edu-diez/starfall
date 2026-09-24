import { Room, Client } from "colyseus";
import { GameRoomState } from "./schema/GameRoomState";
import {
  PlayerRole,
  GamePhase,
  PlayerState,
  Vec2,
  GAME_CONFIG,
  COLORS,
  Color,
  MoveMessage,
  MESSAGE_TYPES,
} from "@starfall/shared";

export class GameRoom extends Room<GameRoomState> {
  override maxClients = GAME_CONFIG.MAX_PLAYERS;

  // Fixed timestep for authoritative simulation (60 Hz)
  private readonly TICK_RATE = 60;
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;
  private simulationInterval: NodeJS.Timeout | null = null;
  private lastTickTime = 0;

  // Store latest validated input per player
  private playerInputs = new Map<
    string,
    { direction: Vec2; timestamp: number }
  >();

  override onCreate(options: any) {
    this.setState(new GameRoomState());
    this.state.phase = GamePhase.Lobby;

    this.onMessage(MESSAGE_TYPES.JOIN, (client: Client, message: any) => {
      this.handleJoin(client, message);
    });

    this.onMessage(MESSAGE_TYPES.LEAVE, (client: Client) => {
      this.handleLeave(client);
    });

    this.onMessage(
      MESSAGE_TYPES.MOVE,
      (client: Client, message: MoveMessage) => {
        this.handleMove(client, message);
      },
    );

    // Start the fixed-rate simulation loop
    this.startSimulationLoop();
  }

  override onJoin(client: Client, options: any) {
    console.log(`Client ${client.sessionId} joined`);
  }

  override onLeave(client: Client, consented: boolean) {
    console.log(`Client ${client.sessionId} left`);
    this.handleLeave(client);
  }

  override onDispose() {
    console.log("Room disposed");
    this.stopSimulationLoop();
  }

  private startSimulationLoop() {
    this.lastTickTime = Date.now();
    this.simulationInterval = setInterval(() => {
      this.tick();
    }, this.TICK_INTERVAL);
  }

  private stopSimulationLoop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private tick() {
    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000; // Convert to seconds
    this.lastTickTime = now;

    // Only simulate movement during playing phase
    if (this.state.phase !== GamePhase.Playing) {
      return;
    }

    // Apply movement for each player based on their latest validated input
    this.state.players.forEach((player, sessionId) => {
      if (player.state !== PlayerState.Alive) return;

      const input = this.playerInputs.get(sessionId);
      if (!input) return;

      // Calculate movement
      const { direction } = input;
      const speed = GAME_CONFIG.PLAYER_SPEED;

      // Calculate new position
      let newX = player.x + direction.x * speed * deltaTime;
      let newY = player.y + direction.y * speed * deltaTime;

      // Apply world boundaries (with player radius padding)
      const radius = GAME_CONFIG.PLAYER_RADIUS;
      newX = Math.max(radius, Math.min(GAME_CONFIG.MAP_WIDTH - radius, newX));
      newY = Math.max(radius, Math.min(GAME_CONFIG.MAP_HEIGHT - radius, newY));

      // Update player position
      player.x = newX;
      player.y = newY;
    });
  }

  private handleJoin(client: Client, message: any) {
    const playerName =
      message?.name || `Player ${client.sessionId.slice(0, 4)}`;

    // Check if player already exists
    if (this.state.players.has(client.sessionId)) {
      return;
    }

    // Check max players
    if (this.state.players.size >= this.maxClients) {
      client.send(MESSAGE_TYPES.ERROR, { message: "Room is full" });
      return;
    }

    // Assign a color
    const usedColors = new Set<string>();
    this.state.players.forEach((player) => usedColors.add(player.color));

    let assignedColor: Color = "#FF0000";
    for (const color of COLORS) {
      if (!usedColors.has(color)) {
        assignedColor = color;
        break;
      }
    }

    // Create player
    const player = this.state.createPlayer(
      client.sessionId,
      playerName,
      assignedColor,
    );
    this.state.players.set(client.sessionId, player);

    // Send welcome message with private role (will be assigned later)
    client.send(MESSAGE_TYPES.WELCOME, {
      sessionId: client.sessionId,
      playerId: client.sessionId,
      color: assignedColor,
      phase: this.state.phase,
    });

    // Broadcast player joined to others
    this.broadcast(
      MESSAGE_TYPES.PLAYER_JOINED,
      {
        sessionId: client.sessionId,
        name: playerName,
        color: assignedColor,
      },
      { except: client },
    );
  }

  private handleLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.state.players.delete(client.sessionId);
      this.playerInputs.delete(client.sessionId);
      this.broadcast(MESSAGE_TYPES.PLAYER_LEFT, {
        sessionId: client.sessionId,
      });
    }
  }

  private handleMove(client: Client, message: MoveMessage) {
    // Validate the player exists and is alive
    const player = this.state.players.get(client.sessionId);
    if (!player || player.state !== PlayerState.Alive) {
      return;
    }

    // Validate input
    const { direction, timestamp } = message;

    // Reject non-finite input
    if (
      !isFinite(direction.x) ||
      !isFinite(direction.y) ||
      !isFinite(timestamp)
    ) {
      return;
    }

    // Clamp/normalize input magnitude to prevent speed hacking
    const magnitude = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y,
    );
    if (magnitude > 1) {
      // Normalize to unit vector
      direction.x /= magnitude;
      direction.y /= magnitude;
    } else if (magnitude < 0) {
      // Reject negative magnitude (shouldn't happen but safety)
      return;
    }

    // Store the validated input for the simulation loop
    this.playerInputs.set(client.sessionId, { direction, timestamp });
  }
}
