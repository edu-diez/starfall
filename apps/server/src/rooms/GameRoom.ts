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
} from "@starfall/shared";
import { LobbySystem } from "../systems/LobbySystem";
import { ColorSystem } from "../systems/ColorSystem";
import { MatchLifecycleSystem } from "../systems/MatchLifecycleSystem";
import { RoleAssignmentSystem, DefaultRandomSource } from "../systems/RoleAssignmentSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { KillSystem, DefaultClock } from "../systems/KillSystem";
import { VictorySystem } from "../systems/VictorySystem";
import { MeetingSystem } from "../systems/MeetingSystem";
import { VotingSystem } from "../systems/VotingSystem";

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
  private killSystem!: KillSystem;
  private victorySystem!: VictorySystem;
  private meetingSystem!: MeetingSystem;
  private votingSystem!: VotingSystem;

  override onCreate(options: any) {
    this.setState(new GameRoomState());
    this.state.phase = GamePhase.Lobby;

    // Initialize systems
    this.lobbySystem = new LobbySystem(this.state);
    this.colorSystem = this.lobbySystem.getColorSystem();
    this.matchLifecycleSystem = new MatchLifecycleSystem(this.state, this.lobbySystem);
    this.roleAssignmentSystem = new RoleAssignmentSystem(this.state, new DefaultRandomSource());
    this.collisionSystem = new CollisionSystem(this.state);
    this.killSystem = new KillSystem(this.state, this.roleAssignmentSystem, new DefaultClock());
    this.victorySystem = new VictorySystem(this.state, this.roleAssignmentSystem);
    this.meetingSystem = new MeetingSystem(this.state, new DefaultClock());
    this.votingSystem = new VotingSystem(this.state, this.roleAssignmentSystem, new DefaultClock());

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

    this.onMessage(MESSAGE_TYPES.VOTE, (client: Client, message: VoteMessage) => {
      this.handleVote(client, message);
    });

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

    // Evaluate victory conditions after movement
    this.victorySystem.evaluate();
    if (this.victorySystem.isMatchEnded()) {
      this.handleGameOver();
    }
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
      this.votingSystem.removePlayer(client.sessionId);
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

    // Movement is only allowed during normal gameplay.
    if (this.state.phase !== GamePhase.Playing) {
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

    // Reset match-private systems for the new match.
    this.meetingSystem.reset();
    this.votingSystem.reset();
    this.victorySystem.reset();

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

  private handleKill(client: Client, message: KillMessage) {
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
    const result = this.killSystem.attemptKill(killerSessionId, message.targetSessionId);

    // Send result to the killer
    const cooldownRemaining = this.killSystem.getCooldownRemaining(killerSessionId);
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
      // Get meeting positions for all living players
      const meetingPositions: Array<{ sessionId: string; x: number; y: number }> = [];
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
    if (!this.matchLifecycleSystem.startVoting() || !this.votingSystem.startVoting()) {
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

  private handleVote(client: Client, message: VoteMessage) {
    const targetSessionId = message?.targetSessionId;
    if (targetSessionId !== null && typeof targetSessionId !== "string") {
      client.send(MESSAGE_TYPES.VOTE_SUBMITTED, {
        success: false,
        reason: "Vote target must be a player or abstention",
      } as VoteSubmittedMessage);
      return;
    }

    const result = this.votingSystem.submitVote(client.sessionId, targetSessionId);
    client.send(MESSAGE_TYPES.VOTE_SUBMITTED, result as VoteSubmittedMessage);
  }

  private handleVoteResolution(resolution: import("../systems/VotingSystem").VoteResolution) {
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
}
