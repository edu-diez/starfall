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
  KillMessage,
  KillResultMessage,
  GameOverMessage,
  CallMeetingMessage,
  MeetingCalledMessage,
  MeetingStartedMessage,
  MeetingStateMessage,
  VoteMessage,
  VoteSubmittedMessage,
  VotingStartedMessage,
  VotingResultsMessage,
  VentEnterMessage,
  VentTravelMessage,
  VentStateMessage,
  ReconnectionStateMessage,
  type AccountProfile,
} from "@starfall/shared";
import type { AuthContext } from "@colyseus/core";
import { LobbySystem } from "../systems/LobbySystem";
import { ColorSystem } from "../systems/ColorSystem";
import { MatchLifecycleSystem } from "../systems/MatchLifecycleSystem";
import {
  RoleAssignmentSystem,
  DefaultRandomSource,
} from "../systems/RoleAssignmentSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { KillSystem, DefaultClock } from "../systems/KillSystem";
import { VictorySystem } from "../systems/VictorySystem";
import { MeetingSystem } from "../systems/MeetingSystem";
import { VotingSystem } from "../systems/VotingSystem";
import { VentSystem } from "../systems/VentSystem";
import {
  type AccountService,
  LocalAccountService,
} from "../services/AccountService";
import { JsonFilePersistenceService } from "../services/PersistenceService";
import {
  isBoundedIdentifier,
  isBoundedMessage,
  isRecord,
  MessageRateLimiter,
} from "../security/MessageSecurity";

interface AuthenticatedClient extends Client {
  auth?: AccountProfile;
}

const MESSAGE_RATE_LIMITS: Record<string, { maxEvents: number; windowMs: number }> = {
  [MESSAGE_TYPES.MOVE]: { maxEvents: 75, windowMs: 1000 },
  [MESSAGE_TYPES.JOIN]: { maxEvents: 2, windowMs: 10_000 },
  [MESSAGE_TYPES.LEAVE]: { maxEvents: 2, windowMs: 10_000 },
  [MESSAGE_TYPES.COLOR_CHANGE]: { maxEvents: 10, windowMs: 1000 },
  [MESSAGE_TYPES.READY]: { maxEvents: 10, windowMs: 1000 },
  [MESSAGE_TYPES.MATCH_START]: { maxEvents: 2, windowMs: 1000 },
  [MESSAGE_TYPES.KILL]: { maxEvents: 5, windowMs: 1000 },
  [MESSAGE_TYPES.CALL_MEETING]: { maxEvents: 3, windowMs: 1000 },
  [MESSAGE_TYPES.VOTE]: { maxEvents: 10, windowMs: 1000 },
  [MESSAGE_TYPES.VENT_ENTER]: { maxEvents: 5, windowMs: 1000 },
  [MESSAGE_TYPES.VENT_TRAVEL]: { maxEvents: 10, windowMs: 1000 },
  [MESSAGE_TYPES.VENT_EXIT]: { maxEvents: 5, windowMs: 1000 },
};
const MAX_SIMULATION_DELTA_SECONDS = 0.1;

export class GameRoom extends Room<{ state: GameRoomState }> {
  private static accountService: AccountService = new LocalAccountService(
    new JsonFilePersistenceService(".starfall/accounts.json"),
  );

  static configureAccountService(accountService: AccountService): void {
    GameRoom.accountService = accountService;
  }

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
  private readonly messageRateLimiter = new MessageRateLimiter();

  /** Session IDs currently held by Colyseus for reconnecting clients. */
  private reconnectingSessionIds = new Set<string>();

  // Systems
  private lobbySystem!: LobbySystem;
  private colorSystem!: ColorSystem;
  private matchLifecycleSystem!: MatchLifecycleSystem;
  private roleAssignmentSystem!: RoleAssignmentSystem;
  private collisionSystem!: CollisionSystem;
  private killSystem!: KillSystem;
  private victorySystem!: VictorySystem;
  private meetingSystem!: MeetingSystem;
  private votingSystem!: VotingSystem;
  private ventSystem!: VentSystem;

  override onCreate(options: any) {
    this.setState(new GameRoomState());
    this.state.phase = GamePhase.Lobby;

    // Initialize systems
    this.lobbySystem = new LobbySystem(this.state);
    this.colorSystem = this.lobbySystem.getColorSystem();
    this.matchLifecycleSystem = new MatchLifecycleSystem(
      this.state,
      this.lobbySystem,
    );
    this.roleAssignmentSystem = new RoleAssignmentSystem(
      this.state,
      new DefaultRandomSource(),
    );
    this.collisionSystem = new CollisionSystem(this.state);
    this.ventSystem = new VentSystem(this.state, this.roleAssignmentSystem);
    this.killSystem = new KillSystem(
      this.state,
      this.roleAssignmentSystem,
      new DefaultClock(),
      (sessionId) => this.ventSystem.isVenting(sessionId),
    );
    this.victorySystem = new VictorySystem(
      this.state,
      this.roleAssignmentSystem,
    );
    this.meetingSystem = new MeetingSystem(this.state, new DefaultClock());
    this.votingSystem = new VotingSystem(
      this.state,
      this.roleAssignmentSystem,
      new DefaultClock(),
    );

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

    this.onMessage(MESSAGE_TYPES.MATCH_START, (client: Client, message: unknown) => {
      this.handleMatchStart(client, message);
    });

    this.onMessage(
      MESSAGE_TYPES.KILL,
      (client: Client, message: KillMessage) => {
        this.handleKill(client, message);
      },
    );

    this.onMessage(
      MESSAGE_TYPES.CALL_MEETING,
      (client: Client, message: CallMeetingMessage) => {
        this.handleCallMeeting(client, message);
      },
    );

    this.onMessage(
      MESSAGE_TYPES.VOTE,
      (client: Client, message: VoteMessage) => {
        this.handleVote(client, message);
      },
    );

    this.onMessage(
      MESSAGE_TYPES.VENT_ENTER,
      (client: Client, message: VentEnterMessage) => {
        this.handleVentEnter(client, message);
      },
    );
    this.onMessage(
      MESSAGE_TYPES.VENT_TRAVEL,
      (client: Client, message: VentTravelMessage) => {
        this.handleVentTravel(client, message);
      },
    );
    this.onMessage(MESSAGE_TYPES.VENT_EXIT, (client: Client, message: unknown) => {
      this.handleVentExit(client, message);
    });

    // Start the fixed-rate simulation loop
    this.startSimulationLoop();
  }

  override async onAuth(
    _client: Client,
    _options: unknown,
    context: AuthContext,
  ): Promise<AccountProfile> {
    const result = await GameRoom.accountService.resolveAccount(
      readCookie(
        context.headers.get("cookie") ?? undefined,
        "starfall_account",
      ),
    );
    return result.account;
  }

  override onJoin(client: Client, _options: unknown) {
    console.log(`Client ${client.sessionId} joined`);
  }

  override onDrop(client: Client, _code?: number) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // A dropped connection is neutral immediately but retains its authoritative
    // entity and private state until the reconnect window expires.
    player.isConnected = false;
    this.playerInputs.delete(client.sessionId);
    this.ventSystem.clearPlayer(client.sessionId);
    this.reconnectingSessionIds.add(client.sessionId);
    this.broadcast(MESSAGE_TYPES.PLAYER_LEFT, { sessionId: client.sessionId });

    this.allowReconnection(
      client,
      GAME_CONFIG.RECONNECTION_WINDOW_SECONDS,
    ).catch(() => {
      this.handlePermanentLeave(client.sessionId);
    });
  }

  override onReconnect(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Reconnect session expired",
      });
      return;
    }

    player.isConnected = true;
    this.playerInputs.delete(client.sessionId);
    this.reconnectingSessionIds.delete(client.sessionId);
    this.sendPrivateRecoveryState(client);
  }

  override onLeave(client: Client, _code?: number) {
    // A dropped client that is still inside the Colyseus reconnection window is
    // finalized by allowReconnection()'s rejection callback instead.
    if (!this.reconnectingSessionIds.has(client.sessionId)) {
      this.handlePermanentLeave(client.sessionId);
    }
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
    const deltaTime = Math.min(
      Math.max(0, (now - this.lastTickTime) / 1000),
      MAX_SIMULATION_DELTA_SECONDS,
    );
    this.lastTickTime = now;

    // Update meeting system (checks for discussion timeout)
    const meetingEnded = this.meetingSystem.update();
    if (meetingEnded) {
      this.handleMeetingEnded();
    }

    const voteResolution = this.votingSystem.update();
    if (voteResolution) {
      this.handleVoteResolution(voteResolution);
    }

    if (this.votingSystem.finishResults()) {
      this.handleVoteResultsFinished();
    }

    // Only simulate movement during playing phase
    if (this.state.phase !== GamePhase.Playing) {
      return;
    }

    // Apply movement for each player based on their latest validated input
    this.state.players.forEach((player, sessionId) => {
      if (
        !player.isConnected ||
        player.state !== PlayerState.Alive ||
        this.ventSystem.isVenting(sessionId)
      )
        return;

      const input = this.playerInputs.get(sessionId);
      if (!input) return;

      // Calculate movement
      const { direction } = input;
      const speed = GAME_CONFIG.PLAYER_SPEED;

      // Calculate new position
      let newX = player.x + direction.x * speed * deltaTime;
      let newY = player.y + direction.y * speed * deltaTime;

      // Validate movement with collision system
      if (
        this.collisionSystem.isMovementValid(player.x, player.y, newX, newY)
      ) {
        // Movement is valid, update position
        player.x = newX;
        player.y = newY;
      } else {
        // Movement would collide - try to slide along walls
        // Try X-only movement
        if (
          this.collisionSystem.isMovementValid(
            player.x,
            player.y,
            newX,
            player.y,
          )
        ) {
          player.x = newX;
        }
        // Try Y-only movement
        if (
          this.collisionSystem.isMovementValid(
            player.x,
            player.y,
            player.x,
            newY,
          )
        ) {
          player.y = newY;
        }
        // If neither works, position stays the same (blocked by wall)
      }
    });

    // Evaluate victory conditions after movement
    this.victorySystem.evaluate();
    if (this.victorySystem.isMatchEnded()) {
      this.handleGameOver();
    }
  }

  private handleJoin(client: Client, _message: unknown) {
    if (!this.acceptsMessage(client, MESSAGE_TYPES.JOIN, _message)) return;
    const account = (client as AuthenticatedClient).auth;
    if (!account) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Account authentication required",
      });
      return;
    }

    // A reconnect uses Colyseus' original session ID and never sends JOIN.
    // Reject a separately-created session for an account already represented in
    // the room so it cannot create a duplicate controllable player.
    if (
      this.state.players.has(client.sessionId) ||
      [...this.state.players.values()].some(
        (player) => player.accountId === account.id,
      )
    ) {
      client.send(MESSAGE_TYPES.ERROR, {
        message: "Account already has a player in this room",
      });
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
      account.id,
      account.displayName,
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
      accountId: account.id,
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
        name: account.displayName,
        color: assignedColor,
      },
      { except: client },
    );

    // Broadcast updated lobby state to all
    this.broadcast(MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
  }

  private handleLeave(client: Client) {
    this.handlePermanentLeave(client.sessionId);
  }

  /** Permanently remove a session only after consented leave or grace expiry. */
  private handlePermanentLeave(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    this.reconnectingSessionIds.delete(sessionId);
    this.playerInputs.delete(sessionId);
    this.messageRateLimiter.clearPlayer(sessionId);
    this.ventSystem.clearPlayer(sessionId);
    this.votingSystem.removePlayer(sessionId);
    this.meetingSystem.clearPlayer(sessionId);
    this.killSystem.clearCooldown(sessionId);
    this.roleAssignmentSystem.clearPlayer(sessionId);
    this.lobbySystem.handlePlayerLeave(sessionId);
    this.broadcast(MESSAGE_TYPES.PLAYER_LEFT, { sessionId });

    if (this.lobbySystem.isInLobby()) {
      this.broadcast(
        MESSAGE_TYPES.LOBBY_STATE,
        this.lobbySystem.getLobbyState(),
      );
      return;
    }

    // VictorySystem remains the sole owner of winner calculation, including a
    // permanent departure during an active meeting or vote.
    this.victorySystem.evaluateAfterDeparture();
    if (this.victorySystem.isMatchEnded()) {
      this.handleGameOver();
    }
  }

  private handleMove(client: Client, message: MoveMessage) {
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.MOVE, message) ||
      !isRecord(message) ||
      !isRecord(message.direction) ||
      typeof message.direction.x !== "number" ||
      typeof message.direction.y !== "number" ||
      typeof message.timestamp !== "number"
    ) {
      return;
    }

    // Validate the player exists and is alive
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.isConnected || player.state !== PlayerState.Alive) {
      return;
    }

    // Movement is only allowed during normal gameplay.
    if (
      this.state.phase !== GamePhase.Playing ||
      this.ventSystem.isVenting(client.sessionId)
    ) {
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
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.COLOR_CHANGE, message) ||
      !isRecord(message) ||
      typeof message.color !== "string"
    ) {
      client.send(MESSAGE_TYPES.ERROR, { message: "Invalid color request" });
      return;
    }

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
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.READY, message) ||
      !isRecord(message) ||
      typeof message.ready !== "boolean"
    ) {
      client.send(MESSAGE_TYPES.ERROR, { message: "Invalid ready request" });
      return;
    }

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
      this.broadcast(
        MESSAGE_TYPES.LOBBY_STATE,
        this.lobbySystem.getLobbyState(),
      );
    }
  }

  private handleMatchStart(client: Client, message: unknown) {
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.MATCH_START, message) ||
      !isRecord(message) ||
      Object.keys(message).length > 0
    ) {
      client.send(MESSAGE_TYPES.ERROR, { message: "Invalid match start request" });
      return;
    }
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

    // Reset match-private systems for the new match.
    this.meetingSystem.reset();
    this.votingSystem.reset();
    this.victorySystem.reset();
    this.killSystem.clearAllCooldowns();
    this.ventSystem.clearAll();
    this.clearAllPlayerInputs();

    // Assign roles privately
    const roleAssignments = this.roleAssignmentSystem.assignRoles();

    // Validate assignment
    if (!this.roleAssignmentSystem.validateAssignment()) {
      console.error("Role assignment validation failed!");
      // Reset to lobby on failure
      this.matchLifecycleSystem.resetMatch();
      this.broadcast(
        MESSAGE_TYPES.LOBBY_STATE,
        this.lobbySystem.getLobbyState(),
      );
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
        const targetClient = this.clients.find(
          (c) => c.sessionId === sessionId,
        );
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

  private handleKill(client: Client, message: KillMessage) {
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.KILL, message) ||
      !isRecord(message) ||
      !isBoundedIdentifier(message.targetSessionId)
    ) {
      client.send(MESSAGE_TYPES.KILL_RESULT, {
        success: false,
        reason: "Invalid kill request",
      } as KillResultMessage);
      return;
    }
    const killerSessionId = client.sessionId;

    // Validate the killer exists and is alive
    const killer = this.state.players.get(killerSessionId);
    if (!killer || killer.state !== PlayerState.Alive) {
      client.send(MESSAGE_TYPES.KILL_RESULT, {
        success: false,
        reason: "You are not alive",
      } as KillResultMessage);
      return;
    }

    // Attempt the kill
    const result = this.killSystem.attemptKill(
      killerSessionId,
      message.targetSessionId,
    );

    // Send result to the killer
    const cooldownRemaining =
      this.killSystem.getCooldownRemaining(killerSessionId);
    client.send(MESSAGE_TYPES.KILL_RESULT, {
      success: result.success,
      reason: result.reason,
      targetSessionId: message.targetSessionId,
      cooldownRemaining,
    } as KillResultMessage);

    // If kill was successful, notify all clients about the elimination
    if (result.success) {
      this.broadcast(MESSAGE_TYPES.PLAYER_LEFT, {
        sessionId: message.targetSessionId,
      });

      // Check for victory
      this.victorySystem.evaluate();
      if (this.victorySystem.isMatchEnded()) {
        this.handleGameOver();
      }
    }
  }

  private handleGameOver() {
    const winner = this.victorySystem.getWinner();
    const reason = this.victorySystem.getEndReason();

    // Update public state
    this.state.winner = winner;
    this.state.endReason = reason;

    // Broadcast game over to all clients
    const gameOverMessage: GameOverMessage = {
      winner,
      reason: reason || "Match ended",
    };
    this.broadcast(MESSAGE_TYPES.GAME_OVER, gameOverMessage);
  }

  private handleCallMeeting(client: Client, message: CallMeetingMessage) {
    if (!this.acceptsMessage(client, MESSAGE_TYPES.CALL_MEETING, message)) return;
    const callerSessionId = client.sessionId;

    // Validate the caller exists and is alive
    const caller = this.state.players.get(callerSessionId);
    if (!caller || caller.state !== PlayerState.Alive) {
      const response: MeetingCalledMessage = {
        initiatorSessionId: callerSessionId,
        success: false,
        reason: "You are not alive",
      };
      client.send(MESSAGE_TYPES.MEETING_CALLED, response);
      return;
    }

    // Attempt to call the meeting
    const result = this.meetingSystem.callMeeting(callerSessionId);

    // Send result to the caller
    const response: MeetingCalledMessage = {
      initiatorSessionId: callerSessionId,
      success: result.success,
      reason: result.reason,
    };
    client.send(MESSAGE_TYPES.MEETING_CALLED, response);

    // If meeting was successfully started, notify all clients
    if (result.success) {
      this.ventSystem.clearAll();
      this.clearAllPlayerInputs();

      // Get meeting positions for all living players
      const meetingPositions: Array<{
        sessionId: string;
        x: number;
        y: number;
      }> = [];
      this.state.players.forEach((player, sessionId) => {
        if (player.state === PlayerState.Alive) {
          meetingPositions.push({
            sessionId,
            x: player.x,
            y: player.y,
          });
        }
      });

      const startedMessage: MeetingStartedMessage = {
        initiatorSessionId: callerSessionId,
        discussionEndTime: this.meetingSystem.getDiscussionEndTime(),
        meetingPositions,
      };
      this.broadcast(MESSAGE_TYPES.MEETING_STARTED, startedMessage);

      // Send meeting state to all clients
      this.broadcastMeetingState();
    }
  }

  private handleMeetingEnded() {
    if (
      !this.matchLifecycleSystem.startVoting() ||
      !this.votingSystem.startVoting()
    ) {
      return;
    }

    this.clearAllPlayerInputs();
    const startedMessage: VotingStartedMessage = {
      votingDeadline: this.votingSystem.getVotingDeadline(),
      eligibleVoterIds: this.votingSystem.getEligibleVoterIds(),
    };
    this.broadcast(MESSAGE_TYPES.MEETING_ENDED, {});
    this.broadcast(MESSAGE_TYPES.VOTING_STARTED, startedMessage);
    this.broadcastMeetingState();
  }

  private handleVentEnter(client: Client, message: VentEnterMessage) {
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.VENT_ENTER, message) ||
      !isRecord(message) ||
      !isBoundedIdentifier(message.nodeId)
    ) {
      this.sendVentState(client, {
        success: false,
        reason: "Vent node must be a string",
      });
      return;
    }

    const result = this.ventSystem.enter(client.sessionId, message.nodeId);
    if (result.success) this.playerInputs.delete(client.sessionId);
    this.sendVentState(client, result);
  }

  private handleVentTravel(client: Client, message: VentTravelMessage) {
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.VENT_TRAVEL, message) ||
      !isRecord(message) ||
      !isBoundedIdentifier(message.destinationNodeId)
    ) {
      this.sendVentState(client, {
        success: false,
        reason: "Vent destination must be a string",
      });
      return;
    }

    this.sendVentState(
      client,
      this.ventSystem.travel(client.sessionId, message.destinationNodeId),
    );
  }

  private handleVentExit(client: Client, message: unknown) {
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.VENT_EXIT, message) ||
      !isRecord(message) ||
      Object.keys(message).length > 0
    ) {
      this.sendVentState(client, { success: false, reason: "Invalid vent exit request" });
      return;
    }
    const result = this.ventSystem.exit(client.sessionId);
    this.playerInputs.delete(client.sessionId);
    this.sendVentState(client, result);
  }

  private sendVentState(
    client: Client,
    result: { success: boolean; reason?: string },
  ) {
    const message: VentStateMessage = {
      success: result.success,
      reason: result.reason,
      isVenting: this.ventSystem.isVenting(client.sessionId),
      currentNodeId: this.ventSystem.getCurrentNodeId(client.sessionId),
      connectedNodeIds: this.ventSystem.getConnectedNodeIds(client.sessionId),
    };
    client.send(MESSAGE_TYPES.VENT_STATE, message);
  }

  private handleVote(client: Client, message: VoteMessage) {
    if (
      !this.acceptsMessage(client, MESSAGE_TYPES.VOTE, message) ||
      !isRecord(message)
    ) {
      client.send(MESSAGE_TYPES.VOTE_SUBMITTED, {
        success: false,
        reason: "Invalid vote request",
      } as VoteSubmittedMessage);
      return;
    }
    const targetSessionId = message.targetSessionId;
    if (
      targetSessionId !== null &&
      !isBoundedIdentifier(targetSessionId)
    ) {
      client.send(MESSAGE_TYPES.VOTE_SUBMITTED, {
        success: false,
        reason: "Vote target must be a player or abstention",
      } as VoteSubmittedMessage);
      return;
    }

    const result = this.votingSystem.submitVote(
      client.sessionId,
      targetSessionId,
    );
    client.send(MESSAGE_TYPES.VOTE_SUBMITTED, result as VoteSubmittedMessage);
  }

  private handleVoteResolution(
    resolution: import("../systems/VotingSystem").VoteResolution,
  ) {
    if (!this.matchLifecycleSystem.startVoteResolution()) {
      return;
    }

    const totals = Object.fromEntries(resolution.totals);
    const resultMessage: VotingResultsMessage = {
      totals,
      abstainVotes: resolution.abstainVotes,
      ejectedSessionId: resolution.ejectedSessionId,
      ejectedRole: resolution.ejectedRole,
      resultsEndTime: resolution.resultsEndTime,
    };
    this.broadcast(MESSAGE_TYPES.VOTING_RESULTS, resultMessage);

    this.victorySystem.evaluate();
    if (this.victorySystem.isMatchEnded()) {
      this.handleGameOver();
    }
  }

  private handleVoteResultsFinished() {
    if (this.victorySystem.isMatchEnded()) {
      return;
    }

    if (this.matchLifecycleSystem.resumePlayingAfterVote()) {
      this.clearAllPlayerInputs();
    }
  }

  private clearAllPlayerInputs() {
    this.playerInputs.clear();
  }

  private broadcastMeetingState() {
    this.state.players.forEach((player, sessionId) => {
      const targetClient = this.clients.find((c) => c.sessionId === sessionId);
      if (targetClient) {
        const meetingState = this.meetingSystem.getMeetingState(sessionId);
        targetClient.send(MESSAGE_TYPES.MEETING_STATE, meetingState);
      }
    });
  }

  /** Validate basic message size and server-private rate limits before routing. */
  private acceptsMessage(client: Client, messageType: string, message: unknown): boolean {
    if (!isBoundedMessage(message)) {
      client.send(MESSAGE_TYPES.ERROR, { message: "Message is too large or invalid" });
      return false;
    }
    const limit = MESSAGE_RATE_LIMITS[messageType];
    if (!limit || this.messageRateLimiter.allows(client.sessionId, messageType, limit)) {
      return true;
    }
    client.send(MESSAGE_TYPES.ERROR, { message: "Message rate limit exceeded" });
    return false;
  }

  /** Restore only information that the reconnecting player is entitled to see. */
  private sendPrivateRecoveryState(client: Client) {
    const role = this.roleAssignmentSystem.getRole(client.sessionId) ?? null;
    const recovery: ReconnectionStateMessage = {
      role,
      killCooldownRemaining: this.killSystem.getCooldownRemaining(
        client.sessionId,
      ),
      phase: this.state.phase,
    };
    client.send(MESSAGE_TYPES.RECONNECTION_STATE, recovery);

    if (role) {
      client.send(MESSAGE_TYPES.ROLE_ASSIGNMENT, {
        role,
      } as RoleAssignmentMessage);
    }
    client.send(
      MESSAGE_TYPES.MEETING_STATE,
      this.meetingSystem.getMeetingState(client.sessionId),
    );
    this.sendVentState(client, { success: true });
  }
}

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
