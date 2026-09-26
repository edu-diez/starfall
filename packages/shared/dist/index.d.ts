export declare enum PlayerRole {
    Crewmate = "crewmate",
    Killer = "killer"
}
export declare enum PlayerState {
    Alive = "alive",
    Dead = "dead",
    Ejected = "ejected"
}
export declare enum GamePhase {
    Lobby = "lobby",
    AssigningRoles = "assigningRoles",
    Playing = "playing",
    Meeting = "meeting",
    Voting = "voting",
    ResolvingVote = "resolvingVote",
    GameOver = "gameover"
}
export interface Vec2 {
    x: number;
    y: number;
}
export interface PlayerInput {
    direction: Vec2;
    timestamp: number;
}
export * from "./map";
export declare const GAME_CONFIG: {
    readonly MAP_WIDTH: 1920;
    readonly MAP_HEIGHT: 1080;
    readonly PLAYER_SPEED: 200;
    readonly PLAYER_RADIUS: 16;
    readonly KILL_COOLDOWN: 30;
    readonly KILL_RANGE: 50;
    readonly MEETING_COOLDOWN: 60;
    readonly DISCUSSION_TIME: 30;
    readonly VOTING_TIME: 60;
    readonly VOTE_RESULTS_TIME: 5;
    readonly MAX_PLAYERS: 10;
    readonly MIN_PLAYERS: 4;
};
export declare const COLORS: readonly ["#FF0000", "#0000FF", "#00FF00", "#FFD700", "#FF69B4", "#FFA500", "#800080", "#00FFFF", "#FFFFFF", "#8B4513", "#FF4500", "#32CD32", "#1E90FF", "#FF1493", "#FF8C00", "#9932CC", "#00CED1", "#ADFF2F", "#FF6347", "#40E0D0", "#DA70D6"];
export type Color = (typeof COLORS)[number];
export declare const DISPLAY_NAME_MIN_LENGTH = 1;
export declare const DISPLAY_NAME_MAX_LENGTH = 24;
export interface AccountPreferences {
    soundEnabled: boolean;
}
export interface AccountProfile {
    /** Stable, safe-to-display account identifier. Never use this as a credential. */
    id: string;
    displayName: string;
    preferences: AccountPreferences;
}
export interface AccountProfileUpdate {
    displayName?: string;
    preferences?: Partial<AccountPreferences>;
}
export declare const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences;
export type AccountProfileValidation = {
    ok: true;
    value: AccountProfileUpdate;
} | {
    ok: false;
    message: string;
};
export declare function validateAccountProfileUpdate(value: unknown): AccountProfileValidation;
export declare const MESSAGE_TYPES: {
    readonly JOIN: "join";
    readonly LEAVE: "leave";
    readonly MOVE: "move";
    readonly WELCOME: "welcome";
    readonly PLAYER_JOINED: "playerJoined";
    readonly PLAYER_LEFT: "playerLeft";
    readonly ERROR: "error";
    readonly COLOR_CHANGE: "colorChange";
    readonly READY: "ready";
    readonly LOBBY_STATE: "lobbyState";
    readonly MATCH_START: "matchStart";
    readonly ROLE_ASSIGNMENT: "roleAssignment";
    readonly KILL: "kill";
    readonly KILL_RESULT: "killResult";
    readonly GAME_OVER: "gameOver";
    readonly CALL_MEETING: "callMeeting";
    readonly MEETING_CALLED: "meetingCalled";
    readonly MEETING_STARTED: "meetingStarted";
    readonly MEETING_ENDED: "meetingEnded";
    readonly MEETING_STATE: "meetingState";
    readonly VOTE: "vote";
    readonly VOTE_SUBMITTED: "voteSubmitted";
    readonly VOTING_STARTED: "votingStarted";
    readonly VOTING_RESULTS: "votingResults";
    readonly VENT_ENTER: "ventEnter";
    readonly VENT_TRAVEL: "ventTravel";
    readonly VENT_EXIT: "ventExit";
    readonly VENT_STATE: "ventState";
    readonly ACCOUNT_PROFILE: "accountProfile";
};
export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
export interface MoveMessage {
    direction: Vec2;
    timestamp: number;
}
/** Joins the authenticated account associated with the room connection. */
export interface JoinMessage {
}
export interface WelcomeMessage {
    sessionId: string;
    playerId: string;
    accountId: string;
    color: Color;
    phase: GamePhase;
}
export interface AccountProfileMessage {
    profile: AccountProfile;
}
export interface PlayerJoinedMessage {
    sessionId: string;
    name: string;
    color: Color;
}
export interface PlayerLeftMessage {
    sessionId: string;
}
export interface ErrorMessage {
    message: string;
}
export interface ColorChangeMessage {
    color: Color;
}
export interface ReadyMessage {
    ready: boolean;
}
export interface LobbyStateMessage {
    players: Array<{
        sessionId: string;
        name: string;
        color: Color;
        ready: boolean;
    }>;
    minPlayers: number;
    maxPlayers: number;
    canStart: boolean;
}
export interface MatchStartMessage {
    matchId: number;
    phase: GamePhase;
}
export interface RoleAssignmentMessage {
    role: PlayerRole;
}
export interface KillMessage {
    targetSessionId: string;
}
export interface KillResultMessage {
    success: boolean;
    reason?: string;
    targetSessionId?: string;
    cooldownRemaining?: number;
}
export interface GameOverMessage {
    winner: PlayerRole | null;
    reason: string;
}
export interface CallMeetingMessage {
}
export interface MeetingCalledMessage {
    initiatorSessionId: string;
    success: boolean;
    reason?: string;
}
export interface MeetingStartedMessage {
    initiatorSessionId: string;
    discussionEndTime: number;
    meetingPositions: Array<{
        sessionId: string;
        x: number;
        y: number;
    }>;
}
export interface MeetingEndedMessage {
}
export interface MeetingStateMessage {
    phase: "discussion" | "voting" | null;
    initiatorSessionId: string | null;
    discussionEndTime: number | null;
    meetingsRemaining: number;
}
export interface VoteMessage {
    targetSessionId: string | null;
}
export interface VoteSubmittedMessage {
    success: boolean;
    reason?: string;
}
export interface VotingStartedMessage {
    votingDeadline: number;
    eligibleVoterIds: string[];
}
export interface VotingResultsMessage {
    totals: Record<string, number>;
    abstainVotes: number;
    ejectedSessionId: string | null;
    ejectedRole: PlayerRole | null;
    resultsEndTime: number;
}
export interface VentEnterMessage {
    nodeId: string;
}
export interface VentTravelMessage {
    destinationNodeId: string;
}
export interface VentExitMessage {
}
/** Private state sent only to the local Killer. */
export interface VentStateMessage {
    success: boolean;
    isVenting: boolean;
    currentNodeId: string | null;
    connectedNodeIds: string[];
    reason?: string;
}
//# sourceMappingURL=index.d.ts.map