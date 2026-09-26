// Shared types and constants for the game
export var PlayerRole;
(function (PlayerRole) {
    PlayerRole["Crewmate"] = "crewmate";
    PlayerRole["Killer"] = "killer";
})(PlayerRole || (PlayerRole = {}));
export var PlayerState;
(function (PlayerState) {
    PlayerState["Alive"] = "alive";
    PlayerState["Dead"] = "dead";
    PlayerState["Ejected"] = "ejected";
})(PlayerState || (PlayerState = {}));
export var GamePhase;
(function (GamePhase) {
    GamePhase["Lobby"] = "lobby";
    GamePhase["AssigningRoles"] = "assigningRoles";
    GamePhase["Playing"] = "playing";
    GamePhase["Meeting"] = "meeting";
    GamePhase["Voting"] = "voting";
    GamePhase["ResolvingVote"] = "resolvingVote";
    GamePhase["GameOver"] = "gameover";
})(GamePhase || (GamePhase = {}));
// Re-export map types and functions
export * from "./map";
export const GAME_CONFIG = {
    MAP_WIDTH: 1920,
    MAP_HEIGHT: 1080,
    PLAYER_SPEED: 200, // pixels per second
    PLAYER_RADIUS: 16,
    KILL_COOLDOWN: 30, // seconds
    KILL_RANGE: 50,
    MEETING_COOLDOWN: 60, // seconds
    DISCUSSION_TIME: 30, // seconds
    VOTING_TIME: 60, // seconds
    VOTE_RESULTS_TIME: 5, // seconds
    RECONNECTION_WINDOW_SECONDS: 30,
    MAX_PLAYERS: 10,
    MIN_PLAYERS: 4,
};
export const COLORS = [
    "#FF0000", // Red
    "#0000FF", // Blue
    "#00FF00", // Green
    "#FFD700", // Gold
    "#FF69B4", // Pink
    "#FFA500", // Orange
    "#800080", // Purple
    "#00FFFF", // Cyan
    "#FFFFFF", // White
    "#8B4513", // Brown
    "#FF4500", // OrangeRed
    "#32CD32", // LimeGreen
    "#1E90FF", // DodgerBlue
    "#FF1493", // DeepPink
    "#FF8C00", // DarkOrange
    "#9932CC", // DarkOrchid
    "#00CED1", // DarkTurquoise
    "#ADFF2F", // GreenYellow
    "#FF6347", // Tomato
    "#40E0D0", // Turquoise
    "#DA70D6", // Orchid
];
export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 24;
export const DEFAULT_ACCOUNT_PREFERENCES = {
    soundEnabled: true,
};
export function validateAccountProfileUpdate(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ok: false, message: "Profile update must be an object" };
    }
    const update = value;
    const result = {};
    if ("displayName" in update) {
        if (typeof update.displayName !== "string") {
            return { ok: false, message: "Display name must be text" };
        }
        const displayName = update.displayName.trim();
        if (displayName.length < DISPLAY_NAME_MIN_LENGTH ||
            displayName.length > DISPLAY_NAME_MAX_LENGTH) {
            return {
                ok: false,
                message: `Display name must be ${DISPLAY_NAME_MIN_LENGTH}-${DISPLAY_NAME_MAX_LENGTH} characters`,
            };
        }
        result.displayName = displayName;
    }
    if ("preferences" in update) {
        if (!update.preferences ||
            typeof update.preferences !== "object" ||
            Array.isArray(update.preferences)) {
            return { ok: false, message: "Preferences must be an object" };
        }
        const preferences = update.preferences;
        if ("soundEnabled" in preferences &&
            typeof preferences.soundEnabled !== "boolean") {
            return { ok: false, message: "Sound preference must be true or false" };
        }
        result.preferences =
            "soundEnabled" in preferences
                ? { soundEnabled: preferences.soundEnabled }
                : {};
    }
    if (!result.displayName && !result.preferences) {
        return { ok: false, message: "Profile update is empty" };
    }
    return { ok: true, value: result };
}
// Network message types
export const MESSAGE_TYPES = {
    JOIN: "join",
    LEAVE: "leave",
    MOVE: "move",
    WELCOME: "welcome",
    PLAYER_JOINED: "playerJoined",
    PLAYER_LEFT: "playerLeft",
    ERROR: "error",
    COLOR_CHANGE: "colorChange",
    READY: "ready",
    LOBBY_STATE: "lobbyState",
    MATCH_START: "matchStart",
    ROLE_ASSIGNMENT: "roleAssignment",
    KILL: "kill",
    KILL_RESULT: "killResult",
    GAME_OVER: "gameOver",
    CALL_MEETING: "callMeeting",
    MEETING_CALLED: "meetingCalled",
    MEETING_STARTED: "meetingStarted",
    MEETING_ENDED: "meetingEnded",
    MEETING_STATE: "meetingState",
    VOTE: "vote",
    VOTE_SUBMITTED: "voteSubmitted",
    VOTING_STARTED: "votingStarted",
    VOTING_RESULTS: "votingResults",
    VENT_ENTER: "ventEnter",
    VENT_TRAVEL: "ventTravel",
    VENT_EXIT: "ventExit",
    VENT_STATE: "ventState",
    RECONNECTION_STATE: "reconnectionState",
    ACCOUNT_PROFILE: "accountProfile",
};
