import { GameRoomState } from "../rooms/schema/GameRoomState";
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
export declare class DefaultClock implements Clock {
    now(): number;
}
/**
 * MeetingSystem handles emergency meetings and discussion phase
 * All meeting logic is server-side only
 */
export declare class MeetingSystem {
    private state;
    private clock;
    private meetingsUsed;
    private meetingInitiator;
    private discussionEndTime;
    constructor(state: GameRoomState, clock?: Clock);
    /**
     * Attempt to call an emergency meeting
     * Returns result with success status and optional error reason
     */
    callMeeting(callerSessionId: string): MeetingResult;
    /**
     * Start the meeting - transition to Meeting phase and teleport players
     */
    private startMeeting;
    /**
     * Teleport all living players to meeting room positions
     */
    private teleportPlayersToMeetingRoom;
    /**
     * Update meeting state - call this each tick to check for discussion timeout
     * Returns true if the meeting phase ended (transition to voting)
     */
    update(): boolean;
    /**
     * End the discussion phase and transition to voting
     */
    private endDiscussion;
    /**
     * Get the number of meetings remaining for a player
     */
    getMeetingsRemaining(sessionId: string): number;
    /**
     * Check if a player can call a meeting
     */
    canCallMeeting(sessionId: string): boolean;
    /**
     * Get the meeting initiator session ID
     */
    getMeetingInitiator(): string | null;
    /**
     * Get the discussion end time
     */
    getDiscussionEndTime(): number;
    /**
     * Get meeting state for synchronization
     */
    getMeetingState(sessionId: string): MeetingState;
    /**
     * Reset meeting state for a new match
     */
    reset(): void;
    /**
     * Set a custom clock (for testing)
     */
    setClock(clock: Clock): void;
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
//# sourceMappingURL=MeetingSystem.d.ts.map