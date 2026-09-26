import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { GamePhase, PlayerState, GAME_CONFIG, Vec2 } from "@starfall/shared";
import { STARFALL_MAP, getMapDefinition } from "@starfall/shared";

/**
 * Interface for injectable clock
 * Allows deterministic testing of timers
 */
export interface Clock {
  now(): number;
}

/**
 * Default clock using Date.now()
 */
export class DefaultClock implements Clock {
  now(): number {
    return Date.now();
  }
}

/**
 * MeetingSystem handles emergency meetings and discussion phase
 * All meeting logic is server-side only
 */
export class MeetingSystem {
  private state: GameRoomState;
  private clock: Clock;

  // Private meeting tracking per player (server-only)
  private meetingsUsed = new Map<string, number>(); // sessionId -> count of meetings used
  private meetingInitiator: string | null = null;
  private discussionEndTime: number = 0;

  constructor(state: GameRoomState, clock?: Clock) {
    this.state = state;
    this.clock = clock || new DefaultClock();
  }

  /**
   * Attempt to call an emergency meeting
   * Returns result with success status and optional error reason
   */
  callMeeting(callerSessionId: string): MeetingResult {
    // Check if a meeting is already active
    if (this.state.phase === GamePhase.Meeting) {
      return { success: false, reason: "A meeting is already in progress" };
    }

    // Validate phase - only allowed during playing
    if (this.state.phase !== GamePhase.Playing) {
      return {
        success: false,
        reason: "Meeting can only be called during playing phase",
      };
    }

    // Validate caller exists and is alive
    const caller = this.state.players.get(callerSessionId);
    if (!caller) {
      return { success: false, reason: "Caller not found" };
    }
    if (caller.state !== PlayerState.Alive) {
      return {
        success: false,
        reason: "Only living players can call meetings",
      };
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
  private startMeeting(initiatorSessionId: string): void {
    this.meetingInitiator = initiatorSessionId;
    this.meetingsUsed.set(initiatorSessionId, 1);

    // Transition to Meeting phase
    this.state.phase = GamePhase.Meeting;

    // Set discussion end time
    this.discussionEndTime =
      this.clock.now() + GAME_CONFIG.DISCUSSION_TIME * 1000;
    this.state.meetingEndTime = this.discussionEndTime;

    // Teleport all living players to meeting room positions
    this.teleportPlayersToMeetingRoom();
  }

  /**
   * Teleport all living players to meeting room positions
   */
  private teleportPlayersToMeetingRoom(): void {
    const meetingRoom = STARFALL_MAP.rooms.find(
      (r) => r.id === STARFALL_MAP.meetingRoomId,
    );
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
      if (player.state === PlayerState.Alive) {
        const spawnPoint = spawnPoints[spawnIndex % spawnPoints.length]!;
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
  update(): boolean {
    if (this.state.phase !== GamePhase.Meeting) {
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
  private endDiscussion(): void {
    // The actual transition to voting will be handled by the voting system
    // For now, we just mark the meeting as ended
    this.meetingInitiator = null;
    this.discussionEndTime = 0;
    this.state.meetingEndTime = 0;
  }

  /**
   * Get the number of meetings remaining for a player
   */
  getMeetingsRemaining(sessionId: string): number {
    const used = this.meetingsUsed.get(sessionId) || 0;
    return Math.max(0, 1 - used);
  }

  /**
   * Check if a player can call a meeting
   */
  canCallMeeting(sessionId: string): boolean {
    const player = this.state.players.get(sessionId);
    if (!player || player.state !== PlayerState.Alive) {
      return false;
    }
    return this.getMeetingsRemaining(sessionId) > 0;
  }

  /**
   * Get the meeting initiator session ID
   */
  getMeetingInitiator(): string | null {
    return this.meetingInitiator;
  }

  /**
   * Get the discussion end time
   */
  getDiscussionEndTime(): number {
    return this.discussionEndTime;
  }

  /**
   * Get meeting state for synchronization
   */
  getMeetingState(sessionId: string): MeetingState {
    return {
      phase:
        this.state.phase === GamePhase.Meeting
          ? "discussion"
          : this.state.phase === GamePhase.Voting
            ? "voting"
            : null,
      initiatorSessionId: this.meetingInitiator,
      discussionEndTime:
        this.state.phase === GamePhase.Meeting ? this.discussionEndTime : null,
      meetingsRemaining: this.getMeetingsRemaining(sessionId),
    };
  }

  /**
   * Reset meeting state for a new match
   */
  reset(): void {
    this.meetingsUsed.clear();
    this.meetingInitiator = null;
    this.discussionEndTime = 0;
  }

  /** Remove private per-player state after permanent departure. */
  clearPlayer(sessionId: string): void {
    this.meetingsUsed.delete(sessionId);
    if (this.meetingInitiator === sessionId) {
      this.meetingInitiator = null;
    }
  }

  /**
   * Set a custom clock (for testing)
   */
  setClock(clock: Clock): void {
    this.clock = clock;
  }
}

/**
 * Result of a meeting call attempt
 */
export interface MeetingResult {
  success: boolean;
  reason?: string;
}

/**
 * Meeting state for client synchronization
 */
export interface MeetingState {
  phase: "discussion" | "voting" | null;
  initiatorSessionId: string | null;
  discussionEndTime: number | null;
  meetingsRemaining: number;
}
