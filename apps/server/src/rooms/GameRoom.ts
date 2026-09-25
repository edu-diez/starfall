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
  ColorChangeMessage,
  ReadyMessage,
  LobbyStateMessage,
  MatchStartMessage,
  RoleAssignmentMessage,
} from "@starfall/shared";
import { LobbySystem } from "../systems/LobbySystem";
import { ColorSystem } from "../systems/ColorSystem";
import { MatchLifecycleSystem } from "../systems/MatchLifecycleSystem";
import { RoleAssignmentSystem, DefaultRandomSource } from "../systems/RoleAssignmentSystem";
import { CollisionSystem } from "../systems/CollisionSystem";

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

  // Systems
  private lobbySystem!: LobbySystem;
  private colorSystem!: ColorSystem;
  private matchLifecycleSystem!: MatchLifecycleSystem;
  private roleAssignmentSystem!: RoleAssignmentSystem;
  private collisionSystem!: CollisionSystem;

  override onCreate(options: any) {
    this.setState(new GameRoomState());
    this.state.phase = GamePhase.Lobby;

    // Initialize systems
    this.lobbySystem = new LobbySystem(this.state);
    this.colorSystem = this.lobbySystem.getColorSystem();
    this.matchLifecycleSystem = new MatchLifecycleSystem(this.state, this.lobbySystem);
    this.roleAssignmentSystem = new RoleAssignmentSystem(this.state, new DefaultRandomSource());
    this.collisionSystem = new CollisionSystem(this.state);

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

    this.onMessage(
      MESSAGE_TYPES.COLOR_CHANGE,
      (client: Client, message: ColorChangeMessage) => {
        this.handleColorChange(client, message);
      },
    );

    this.onMessage(
      MESSAGE_TYPES.READY,
      (client: Client, message: ReadyMessage) => {
        this.handleReady(client, message);
      },
    );

    this.onMessage(
      MESSAGE_TYPES.MATCH_START,
      (client: Client) => {
        this.handleMatchStart(client);
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

      // Validate movement with collision system
      if (this.collisionSystem.isMovementValid(player.x, player.y, newX, newY)) {
        // Movement is valid, update position
        player.x = newX;
        player.y = newY;
      } else {
        // Movement would collide - try to slide along walls
        // Try X-only movement
        if (this.collisionSystem.isMovementValid(player.x, player.y, newX, player.y)) {
          player.x = newX;
        }
        // Try Y-only movement
        if (this.collisionSystem.isMovementValid(player.x, player.y, player.x, newY)) {
          player.y = newY;
        }
        // If neither works, position stays the same (blocked by wall)
      }
    });
  }

  private handleJoin(client: Client, message: any) {
    const playerName =
      message?.name || `Player ${client.sessionId.slice(0, 4)}`;

    // Check if player already exists
    if (this.state.players.has(client.sessionId)) {
      return;
    }

    // Check if can join (lobby phase and not full)
    if (!this.lobbySystem.canJoin()) {
      client.send(MESSAGE_TYPES.ERROR, { message: "Cannot join at this time" });
      return;
    }

    // Get a valid spawn point from collision system
    const spawnPoint = this.collisionSystem.getValidSpawnPoint();

    // Handle player join through lobby system (assigns color)
    const assignedColor = this.lobbySystem.handlePlayerJoin(
      client.sessionId,
      playerName,
    );

    // Set the player's position to the valid spawn point
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.x = spawnPoint.x;
      player.y = spawnPoint.y;
    }

    // Send welcome message with private role (will be assigned later)
    client.send(MESSAGE_TYPES.WELCOME, {
      sessionId: client.sessionId,
      playerId: client.sessionId,
      color: assignedColor,
      phase: this.state.phase,
    });

    // Send current lobby state to the new player
    client.send(MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());

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

    // Broadcast updated lobby state to all
    this.broadcast(MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
  }

  private handleLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.lobbySystem.handlePlayerLeave(client.sessionId);
      this.playerInputs.delete(client.sessionId);
      this.broadcast(MESSAGE_TYPES.PLAYER_LEFT, {
        sessionId: client.sessionId,
      });

      // Broadcast updated lobby state to all
      if (this.lobbySystem.isInLobby()) {
        this.broadcast(MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
      }
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

  private handleColorChange(client: Client, message: ColorChangeMessage) {
    // Only allow color changes in lobby phase
    if (!this.lobbySystem.isInLobby()) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Color changes only allowed in lobby",
      });
      return;
    }

    // Validate the player exists
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    // Validate color is known
    if (!COLORS.includes(message.color)) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Unknown color",
      });
      return;
    }

    // Try to assign the color
    const newColor = this.lobbySystem.handleColorChange(
      client.sessionId,
      message.color,
    );

    if (newColor) {
      // Success - broadcast to all clients
      this.broadcast(MESSAGE_TYPES.COLOR_CHANGE, {
        sessionId: client.sessionId,
        color: newColor,
      });
    } else {
      // Failed - color already taken
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Color already in use",
      });
    }
  }

  private handleReady(client: Client, message: ReadyMessage) {
    // Only allow ready changes in lobby phase
    if (!this.lobbySystem.isInLobby()) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Ready changes only allowed in lobby",
      });
      return;
    }

    // Validate the player exists
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    // Set ready status
    const success = this.lobbySystem.setReady(client.sessionId, message.ready);

    if (success) {
      // Broadcast updated lobby state to all clients
      this.broadcast(MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
    }
  }

  private handleMatchStart(client: Client) {
    // Only the host (first player) can start the match, or any player if we allow it
    // For MVP, allow any player to start if conditions are met
    if (!this.matchLifecycleSystem.canStartMatch()) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Cannot start match: requirements not met",
      });
      return;
    }

    // Start the match - transitions to AssigningRoles
    const started = this.matchLifecycleSystem.startMatch();
    if (!started) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Failed to start match",
      });
      return;
    }

    // Assign roles privately
    const roleAssignments = this.roleAssignmentSystem.assignRoles();

    // Validate assignment
    if (!this.roleAssignmentSystem.validateAssignment()) {
      console.error("Role assignment validation failed!");
      // Reset to lobby on failure
      this.matchLifecycleSystem.resetMatch();
      this.broadcast(MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
      return;
    }

    // Send match start notification to all clients
    const matchStartMessage: MatchStartMessage = {
      matchId: this.matchLifecycleSystem.getMatchId(),
      phase: GamePhase.AssigningRoles,
    };
    this.broadcast(MESSAGE_TYPES.MATCH_START, matchStartMessage);

    // Send private role assignment to each player
    this.state.players.forEach((player, sessionId) => {
      const role = roleAssignments.get(sessionId);
      if (role) {
        const roleMessage: RoleAssignmentMessage = { role };
        const targetClient = this.clients.find((c) => c.sessionId === sessionId);
        if (targetClient) {
          targetClient.send(MESSAGE_TYPES.ROLE_ASSIGNMENT, roleMessage);
        }
      }
    });

    // Complete role assignment and transition to Playing
    this.matchLifecycleSystem.completeRoleAssignment();

    // Broadcast updated lobby state (now with Playing phase)
    this.broadcast(MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
  }
}
