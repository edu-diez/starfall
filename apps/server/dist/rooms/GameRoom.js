"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const colyseus_1 = require("colyseus");
const GameRoomState_1 = require("./schema/GameRoomState");
const shared_1 = require("@starfall/shared");
const LobbySystem_1 = require("../systems/LobbySystem");
const MatchLifecycleSystem_1 = require("../systems/MatchLifecycleSystem");
const RoleAssignmentSystem_1 = require("../systems/RoleAssignmentSystem");
const CollisionSystem_1 = require("../systems/CollisionSystem");
const KillSystem_1 = require("../systems/KillSystem");
const VictorySystem_1 = require("../systems/VictorySystem");
const MeetingSystem_1 = require("../systems/MeetingSystem");
const VotingSystem_1 = require("../systems/VotingSystem");
const VentSystem_1 = require("../systems/VentSystem");
const AccountService_1 = require("../services/AccountService");
const PersistenceService_1 = require("../services/PersistenceService");
class GameRoom extends colyseus_1.Room {
    static accountService = new AccountService_1.LocalAccountService(new PersistenceService_1.JsonFilePersistenceService(".starfall/accounts.json"));
    static configureAccountService(accountService) {
        GameRoom.accountService = accountService;
    }
    maxClients = shared_1.GAME_CONFIG.MAX_PLAYERS;
    // Fixed timestep for authoritative simulation (60 Hz)
    TICK_RATE = 60;
    TICK_INTERVAL = 1000 / this.TICK_RATE;
    simulationInterval = null;
    lastTickTime = 0;
    // Store latest validated input per player
    playerInputs = new Map();
    // Systems
    lobbySystem;
    colorSystem;
    matchLifecycleSystem;
    roleAssignmentSystem;
    collisionSystem;
    killSystem;
    victorySystem;
    meetingSystem;
    votingSystem;
    ventSystem;
    onCreate(options) {
        this.setState(new GameRoomState_1.GameRoomState());
        this.state.phase = shared_1.GamePhase.Lobby;
        // Initialize systems
        this.lobbySystem = new LobbySystem_1.LobbySystem(this.state);
        this.colorSystem = this.lobbySystem.getColorSystem();
        this.matchLifecycleSystem = new MatchLifecycleSystem_1.MatchLifecycleSystem(this.state, this.lobbySystem);
        this.roleAssignmentSystem = new RoleAssignmentSystem_1.RoleAssignmentSystem(this.state, new RoleAssignmentSystem_1.DefaultRandomSource());
        this.collisionSystem = new CollisionSystem_1.CollisionSystem(this.state);
        this.ventSystem = new VentSystem_1.VentSystem(this.state, this.roleAssignmentSystem);
        this.killSystem = new KillSystem_1.KillSystem(this.state, this.roleAssignmentSystem, new KillSystem_1.DefaultClock(), (sessionId) => this.ventSystem.isVenting(sessionId));
        this.victorySystem = new VictorySystem_1.VictorySystem(this.state, this.roleAssignmentSystem);
        this.meetingSystem = new MeetingSystem_1.MeetingSystem(this.state, new KillSystem_1.DefaultClock());
        this.votingSystem = new VotingSystem_1.VotingSystem(this.state, this.roleAssignmentSystem, new KillSystem_1.DefaultClock());
        this.onMessage(shared_1.MESSAGE_TYPES.JOIN, (client, message) => {
            this.handleJoin(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.LEAVE, (client) => {
            this.handleLeave(client);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.MOVE, (client, message) => {
            this.handleMove(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.COLOR_CHANGE, (client, message) => {
            this.handleColorChange(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.READY, (client, message) => {
            this.handleReady(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.MATCH_START, (client) => {
            this.handleMatchStart(client);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.KILL, (client, message) => {
            this.handleKill(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.CALL_MEETING, (client, message) => {
            this.handleCallMeeting(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.VOTE, (client, message) => {
            this.handleVote(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.VENT_ENTER, (client, message) => {
            this.handleVentEnter(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.VENT_TRAVEL, (client, message) => {
            this.handleVentTravel(client, message);
        });
        this.onMessage(shared_1.MESSAGE_TYPES.VENT_EXIT, (client) => {
            this.handleVentExit(client);
        });
        // Start the fixed-rate simulation loop
        this.startSimulationLoop();
    }
    async onAuth(_client, _options, context) {
        const result = await GameRoom.accountService.resolveAccount(readCookie(context.headers.get("cookie") ?? undefined, "starfall_account"));
        return result.account;
    }
    onJoin(client, _options) {
        console.log(`Client ${client.sessionId} joined`);
    }
    onLeave(client, code) {
        console.log(`Client ${client.sessionId} left`);
        this.handleLeave(client);
    }
    onDispose() {
        console.log("Room disposed");
        this.stopSimulationLoop();
    }
    startSimulationLoop() {
        this.lastTickTime = Date.now();
        this.simulationInterval = setInterval(() => {
            this.tick();
        }, this.TICK_INTERVAL);
    }
    stopSimulationLoop() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }
    tick() {
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
        if (this.state.phase !== shared_1.GamePhase.Playing) {
            return;
        }
        // Apply movement for each player based on their latest validated input
        this.state.players.forEach((player, sessionId) => {
            if (player.state !== shared_1.PlayerState.Alive ||
                this.ventSystem.isVenting(sessionId))
                return;
            const input = this.playerInputs.get(sessionId);
            if (!input)
                return;
            // Calculate movement
            const { direction } = input;
            const speed = shared_1.GAME_CONFIG.PLAYER_SPEED;
            // Calculate new position
            let newX = player.x + direction.x * speed * deltaTime;
            let newY = player.y + direction.y * speed * deltaTime;
            // Validate movement with collision system
            if (this.collisionSystem.isMovementValid(player.x, player.y, newX, newY)) {
                // Movement is valid, update position
                player.x = newX;
                player.y = newY;
            }
            else {
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
    handleJoin(client, _message) {
        const account = client.auth;
        if (!account) {
            client.send(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Account authentication required",
            });
            return;
        }
        // Check if player already exists
        if (this.state.players.has(client.sessionId)) {
            return;
        }
        // Check if can join (lobby phase and not full)
        if (!this.lobbySystem.canJoin()) {
            client.send(shared_1.MESSAGE_TYPES.ERROR, { message: "Cannot join at this time" });
            return;
        }
        // Get a valid spawn point from collision system
        const spawnPoint = this.collisionSystem.getValidSpawnPoint();
        // Handle player join through lobby system (assigns color)
        const assignedColor = this.lobbySystem.handlePlayerJoin(client.sessionId, account.id, account.displayName);
        // Set the player's position to the valid spawn point
        const player = this.state.players.get(client.sessionId);
        if (player) {
            player.x = spawnPoint.x;
            player.y = spawnPoint.y;
        }
        // Send welcome message with private role (will be assigned later)
        client.send(shared_1.MESSAGE_TYPES.WELCOME, {
            sessionId: client.sessionId,
            playerId: client.sessionId,
            accountId: account.id,
            color: assignedColor,
            phase: this.state.phase,
        });
        // Send current lobby state to the new player
        client.send(shared_1.MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
        // Broadcast player joined to others
        this.broadcast(shared_1.MESSAGE_TYPES.PLAYER_JOINED, {
            sessionId: client.sessionId,
            name: account.displayName,
            color: assignedColor,
        }, { except: client });
        // Broadcast updated lobby state to all
        this.broadcast(shared_1.MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
    }
    handleLeave(client) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
            this.lobbySystem.handlePlayerLeave(client.sessionId);
            this.playerInputs.delete(client.sessionId);
            this.ventSystem.clearPlayer(client.sessionId);
            this.votingSystem.removePlayer(client.sessionId);
            this.broadcast(shared_1.MESSAGE_TYPES.PLAYER_LEFT, {
                sessionId: client.sessionId,
            });
            // Broadcast updated lobby state to all
            if (this.lobbySystem.isInLobby()) {
                this.broadcast(shared_1.MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
            }
        }
    }
    handleMove(client, message) {
        // Validate the player exists and is alive
        const player = this.state.players.get(client.sessionId);
        if (!player || player.state !== shared_1.PlayerState.Alive) {
            return;
        }
        // Movement is only allowed during normal gameplay.
        if (this.state.phase !== shared_1.GamePhase.Playing ||
            this.ventSystem.isVenting(client.sessionId)) {
            return;
        }
        // Validate input
        const { direction, timestamp } = message;
        // Reject non-finite input
        if (!isFinite(direction.x) ||
            !isFinite(direction.y) ||
            !isFinite(timestamp)) {
            return;
        }
        // Clamp/normalize input magnitude to prevent speed hacking
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (magnitude > 1) {
            // Normalize to unit vector
            direction.x /= magnitude;
            direction.y /= magnitude;
        }
        else if (magnitude < 0) {
            // Reject negative magnitude (shouldn't happen but safety)
            return;
        }
        // Store the validated input for the simulation loop
        this.playerInputs.set(client.sessionId, { direction, timestamp });
    }
    handleColorChange(client, message) {
        // Only allow color changes in lobby phase
        if (!this.lobbySystem.isInLobby()) {
            client.send(shared_1.MESSAGE_TYPES.ERROR, {
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
        if (!shared_1.COLORS.includes(message.color)) {
            client.send(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Unknown color",
            });
            return;
        }
        // Try to assign the color
        const newColor = this.lobbySystem.handleColorChange(client.sessionId, message.color);
        if (newColor) {
            // Success - broadcast to all clients
            this.broadcast(shared_1.MESSAGE_TYPES.COLOR_CHANGE, {
                sessionId: client.sessionId,
                color: newColor,
            });
        }
        else {
            // Failed - color already taken
            client.send(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Color already in use",
            });
        }
    }
    handleReady(client, message) {
        // Only allow ready changes in lobby phase
        if (!this.lobbySystem.isInLobby()) {
            client.send(shared_1.MESSAGE_TYPES.ERROR, {
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
            this.broadcast(shared_1.MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
        }
    }
    handleMatchStart(client) {
        // Only the host (first player) can start the match, or any player if we allow it
        // For MVP, allow any player to start if conditions are met
        if (!this.matchLifecycleSystem.canStartMatch()) {
            client.send(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Cannot start match: requirements not met",
            });
            return;
        }
        // Start the match - transitions to AssigningRoles
        const started = this.matchLifecycleSystem.startMatch();
        if (!started) {
            client.send(shared_1.MESSAGE_TYPES.ERROR, {
                message: "Failed to start match",
            });
            return;
        }
        // Reset match-private systems for the new match.
        this.meetingSystem.reset();
        this.votingSystem.reset();
        this.victorySystem.reset();
        this.ventSystem.clearAll();
        this.clearAllPlayerInputs();
        // Assign roles privately
        const roleAssignments = this.roleAssignmentSystem.assignRoles();
        // Validate assignment
        if (!this.roleAssignmentSystem.validateAssignment()) {
            console.error("Role assignment validation failed!");
            // Reset to lobby on failure
            this.matchLifecycleSystem.resetMatch();
            this.broadcast(shared_1.MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
            return;
        }
        // Send match start notification to all clients
        const matchStartMessage = {
            matchId: this.matchLifecycleSystem.getMatchId(),
            phase: shared_1.GamePhase.AssigningRoles,
        };
        this.broadcast(shared_1.MESSAGE_TYPES.MATCH_START, matchStartMessage);
        // Send private role assignment to each player
        this.state.players.forEach((player, sessionId) => {
            const role = roleAssignments.get(sessionId);
            if (role) {
                const roleMessage = { role };
                const targetClient = this.clients.find((c) => c.sessionId === sessionId);
                if (targetClient) {
                    targetClient.send(shared_1.MESSAGE_TYPES.ROLE_ASSIGNMENT, roleMessage);
                }
            }
        });
        // Complete role assignment and transition to Playing
        this.matchLifecycleSystem.completeRoleAssignment();
        // Broadcast updated lobby state (now with Playing phase)
        this.broadcast(shared_1.MESSAGE_TYPES.LOBBY_STATE, this.lobbySystem.getLobbyState());
    }
    handleKill(client, message) {
        const killerSessionId = client.sessionId;
        // Validate the killer exists and is alive
        const killer = this.state.players.get(killerSessionId);
        if (!killer || killer.state !== shared_1.PlayerState.Alive) {
            client.send(shared_1.MESSAGE_TYPES.KILL_RESULT, {
                success: false,
                reason: "You are not alive",
            });
            return;
        }
        // Attempt the kill
        const result = this.killSystem.attemptKill(killerSessionId, message.targetSessionId);
        // Send result to the killer
        const cooldownRemaining = this.killSystem.getCooldownRemaining(killerSessionId);
        client.send(shared_1.MESSAGE_TYPES.KILL_RESULT, {
            success: result.success,
            reason: result.reason,
            targetSessionId: message.targetSessionId,
            cooldownRemaining,
        });
        // If kill was successful, notify all clients about the elimination
        if (result.success) {
            this.broadcast(shared_1.MESSAGE_TYPES.PLAYER_LEFT, {
                sessionId: message.targetSessionId,
            });
            // Check for victory
            this.victorySystem.evaluate();
            if (this.victorySystem.isMatchEnded()) {
                this.handleGameOver();
            }
        }
    }
    handleGameOver() {
        const winner = this.victorySystem.getWinner();
        const reason = this.victorySystem.getEndReason();
        // Update public state
        this.state.winner = winner;
        this.state.endReason = reason;
        // Broadcast game over to all clients
        const gameOverMessage = {
            winner,
            reason: reason || "Match ended",
        };
        this.broadcast(shared_1.MESSAGE_TYPES.GAME_OVER, gameOverMessage);
    }
    handleCallMeeting(client, message) {
        const callerSessionId = client.sessionId;
        // Validate the caller exists and is alive
        const caller = this.state.players.get(callerSessionId);
        if (!caller || caller.state !== shared_1.PlayerState.Alive) {
            const response = {
                initiatorSessionId: callerSessionId,
                success: false,
                reason: "You are not alive",
            };
            client.send(shared_1.MESSAGE_TYPES.MEETING_CALLED, response);
            return;
        }
        // Attempt to call the meeting
        const result = this.meetingSystem.callMeeting(callerSessionId);
        // Send result to the caller
        const response = {
            initiatorSessionId: callerSessionId,
            success: result.success,
            reason: result.reason,
        };
        client.send(shared_1.MESSAGE_TYPES.MEETING_CALLED, response);
        // If meeting was successfully started, notify all clients
        if (result.success) {
            this.ventSystem.clearAll();
            this.clearAllPlayerInputs();
            // Get meeting positions for all living players
            const meetingPositions = [];
            this.state.players.forEach((player, sessionId) => {
                if (player.state === shared_1.PlayerState.Alive) {
                    meetingPositions.push({
                        sessionId,
                        x: player.x,
                        y: player.y,
                    });
                }
            });
            const startedMessage = {
                initiatorSessionId: callerSessionId,
                discussionEndTime: this.meetingSystem.getDiscussionEndTime(),
                meetingPositions,
            };
            this.broadcast(shared_1.MESSAGE_TYPES.MEETING_STARTED, startedMessage);
            // Send meeting state to all clients
            this.broadcastMeetingState();
        }
    }
    handleMeetingEnded() {
        if (!this.matchLifecycleSystem.startVoting() ||
            !this.votingSystem.startVoting()) {
            return;
        }
        this.clearAllPlayerInputs();
        const startedMessage = {
            votingDeadline: this.votingSystem.getVotingDeadline(),
            eligibleVoterIds: this.votingSystem.getEligibleVoterIds(),
        };
        this.broadcast(shared_1.MESSAGE_TYPES.MEETING_ENDED, {});
        this.broadcast(shared_1.MESSAGE_TYPES.VOTING_STARTED, startedMessage);
        this.broadcastMeetingState();
    }
    handleVentEnter(client, message) {
        if (!message || typeof message.nodeId !== "string") {
            this.sendVentState(client, {
                success: false,
                reason: "Vent node must be a string",
            });
            return;
        }
        const result = this.ventSystem.enter(client.sessionId, message.nodeId);
        if (result.success)
            this.playerInputs.delete(client.sessionId);
        this.sendVentState(client, result);
    }
    handleVentTravel(client, message) {
        if (!message || typeof message.destinationNodeId !== "string") {
            this.sendVentState(client, {
                success: false,
                reason: "Vent destination must be a string",
            });
            return;
        }
        this.sendVentState(client, this.ventSystem.travel(client.sessionId, message.destinationNodeId));
    }
    handleVentExit(client) {
        const result = this.ventSystem.exit(client.sessionId);
        this.playerInputs.delete(client.sessionId);
        this.sendVentState(client, result);
    }
    sendVentState(client, result) {
        const message = {
            success: result.success,
            reason: result.reason,
            isVenting: this.ventSystem.isVenting(client.sessionId),
            currentNodeId: this.ventSystem.getCurrentNodeId(client.sessionId),
            connectedNodeIds: this.ventSystem.getConnectedNodeIds(client.sessionId),
        };
        client.send(shared_1.MESSAGE_TYPES.VENT_STATE, message);
    }
    handleVote(client, message) {
        const targetSessionId = message?.targetSessionId;
        if (targetSessionId !== null && typeof targetSessionId !== "string") {
            client.send(shared_1.MESSAGE_TYPES.VOTE_SUBMITTED, {
                success: false,
                reason: "Vote target must be a player or abstention",
            });
            return;
        }
        const result = this.votingSystem.submitVote(client.sessionId, targetSessionId);
        client.send(shared_1.MESSAGE_TYPES.VOTE_SUBMITTED, result);
    }
    handleVoteResolution(resolution) {
        if (!this.matchLifecycleSystem.startVoteResolution()) {
            return;
        }
        const totals = Object.fromEntries(resolution.totals);
        const resultMessage = {
            totals,
            abstainVotes: resolution.abstainVotes,
            ejectedSessionId: resolution.ejectedSessionId,
            ejectedRole: resolution.ejectedRole,
            resultsEndTime: resolution.resultsEndTime,
        };
        this.broadcast(shared_1.MESSAGE_TYPES.VOTING_RESULTS, resultMessage);
        this.victorySystem.evaluate();
        if (this.victorySystem.isMatchEnded()) {
            this.handleGameOver();
        }
    }
    handleVoteResultsFinished() {
        if (this.victorySystem.isMatchEnded()) {
            return;
        }
        if (this.matchLifecycleSystem.resumePlayingAfterVote()) {
            this.clearAllPlayerInputs();
        }
    }
    clearAllPlayerInputs() {
        this.playerInputs.clear();
    }
    broadcastMeetingState() {
        this.state.players.forEach((player, sessionId) => {
            const targetClient = this.clients.find((c) => c.sessionId === sessionId);
            if (targetClient) {
                const meetingState = this.meetingSystem.getMeetingState(sessionId);
                targetClient.send(shared_1.MESSAGE_TYPES.MEETING_STATE, meetingState);
            }
        });
    }
}
exports.GameRoom = GameRoom;
function readCookie(cookieHeader, name) {
    if (!cookieHeader)
        return undefined;
    return cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${name}=`))
        ?.slice(name.length + 1);
}
