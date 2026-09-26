"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingSystem = exports.DefaultClock = void 0;
const shared_1 = require("@starfall/shared");
const shared_2 = require("@starfall/shared");
/**
 * Default clock using Date.now()
 */
class DefaultClock {
    now() {
        return Date.now();
    }
}
exports.DefaultClock = DefaultClock;
/**
 * MeetingSystem handles emergency meetings and discussion phase
 * All meeting logic is server-side only
 */
class MeetingSystem {
    state;
    clock;
    // Private meeting tracking per player (server-only)
    meetingsUsed = new Map(); // sessionId -> count of meetings used
    meetingInitiator = null;
    discussionEndTime = 0;
    constructor(state, clock) {
        this.state = state;
        this.clock = clock || new DefaultClock();
    }
    /**
     * Attempt to call an emergency meeting
     * Returns result with success status and optional error reason
     */
    callMeeting(callerSessionId) {
        // Check if a meeting is already active
        if (this.state.phase === shared_1.GamePhase.Meeting) {
            return { success: false, reason: "A meeting is already in progress" };
        }
        // Validate phase - only allowed during playing
        if (this.state.phase !== shared_1.GamePhase.Playing) {
            return { success: false, reason: "Meeting can only be called during playing phase" };
        }
        // Validate caller exists and is alive
        const caller = this.state.players.get(callerSessionId);
        if (!caller) {
            return { success: false, reason: "Caller not found" };
        }
        if (caller.state !== shared_1.PlayerState.Alive) {
            return { success: false, reason: "Only living players can call meetings" };
        }
        // Check if caller has a meeting available
        const meetingsUsed = this.meetingsUsed.get(callerSessionId) || 0;
        if (meetingsUsed >= 1) {
            return { success: false, reason: "No emergency meetings remaining" };
        }
        // All validations passed - start the meeting
        this.startMeeting(callerSessionId);
        return { success: true };
    }
    /**
     * Start the meeting - transition to Meeting phase and teleport players
     */
    startMeeting(initiatorSessionId) {
        this.meetingInitiator = initiatorSessionId;
        this.meetingsUsed.set(initiatorSessionId, 1);
        // Transition to Meeting phase
        this.state.phase = shared_1.GamePhase.Meeting;
        // Set discussion end time
        this.discussionEndTime = this.clock.now() + shared_1.GAME_CONFIG.DISCUSSION_TIME * 1000;
        this.state.meetingEndTime = this.discussionEndTime;
        // Teleport all living players to meeting room positions
        this.teleportPlayersToMeetingRoom();
    }
    /**
     * Teleport all living players to meeting room positions
     */
    teleportPlayersToMeetingRoom() {
        const meetingRoom = shared_2.STARFALL_MAP.rooms.find(r => r.id === shared_2.STARFALL_MAP.meetingRoomId);
        if (!meetingRoom) {
            console.error("Meeting room not found in map definition");
            return;
        }
        const spawnPoints = meetingRoom.spawnPoints;
        if (spawnPoints.length === 0) {
            console.error("Meeting room has no spawn points");
            return;
        }
        let spawnIndex = 0;
        this.state.players.forEach((player, sessionId) => {
            if (player.state === shared_1.PlayerState.Alive) {
                const spawnPoint = spawnPoints[spawnIndex % spawnPoints.length];
                player.x = spawnPoint.x;
                player.y = spawnPoint.y;
                spawnIndex++;
            }
        });
    }
    /**
     * Update meeting state - call this each tick to check for discussion timeout
     * Returns true if the meeting phase ended (transition to voting)
     */
    update() {
        if (this.state.phase !== shared_1.GamePhase.Meeting) {
            return false;
        }
        const now = this.clock.now();
        if (now >= this.discussionEndTime) {
            this.endDiscussion();
            return true;
        }
        return false;
    }
    /**
     * End the discussion phase and transition to voting
     */
    endDiscussion() {
        // The actual transition to voting will be handled by the voting system
        // For now, we just mark the meeting as ended
        this.meetingInitiator = null;
        this.discussionEndTime = 0;
        this.state.meetingEndTime = 0;
    }
    /**
     * Get the number of meetings remaining for a player
     */
    getMeetingsRemaining(sessionId) {
        const used = this.meetingsUsed.get(sessionId) || 0;
        return Math.max(0, 1 - used);
    }
    /**
     * Check if a player can call a meeting
     */
    canCallMeeting(sessionId) {
        const player = this.state.players.get(sessionId);
        if (!player || player.state !== shared_1.PlayerState.Alive) {
            return false;
        }
        return this.getMeetingsRemaining(sessionId) > 0;
    }
    /**
     * Get the meeting initiator session ID
     */
    getMeetingInitiator() {
        return this.meetingInitiator;
    }
    /**
     * Get the discussion end time
     */
    getDiscussionEndTime() {
        return this.discussionEndTime;
    }
    /**
     * Get meeting state for synchronization
     */
    getMeetingState(sessionId) {
        return {
            phase: this.state.phase === shared_1.GamePhase.Meeting
                ? "discussion"
                : this.state.phase === shared_1.GamePhase.Voting
                    ? "voting"
                    : null,
            initiatorSessionId: this.meetingInitiator,
            discussionEndTime: this.state.phase === shared_1.GamePhase.Meeting ? this.discussionEndTime : null,
            meetingsRemaining: this.getMeetingsRemaining(sessionId),
        };
    }
    /**
     * Reset meeting state for a new match
     */
    reset() {
        this.meetingsUsed.clear();
        this.meetingInitiator = null;
        this.discussionEndTime = 0;
    }
    /**
     * Set a custom clock (for testing)
     */
    setClock(clock) {
        this.clock = clock;
    }
}
exports.MeetingSystem = MeetingSystem;
