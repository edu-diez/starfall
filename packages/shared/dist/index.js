"use strict";
// Shared types and constants for the game
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_TYPES = exports.DEFAULT_ACCOUNT_PREFERENCES = exports.DISPLAY_NAME_MAX_LENGTH = exports.DISPLAY_NAME_MIN_LENGTH = exports.COLORS = exports.GAME_CONFIG = exports.GamePhase = exports.PlayerState = exports.PlayerRole = void 0;
exports.validateAccountProfileUpdate = validateAccountProfileUpdate;
var PlayerRole;
(function (PlayerRole) {
    PlayerRole["Crewmate"] = "crewmate";
    PlayerRole["Killer"] = "killer";
})(PlayerRole || (exports.PlayerRole = PlayerRole = {}));
var PlayerState;
(function (PlayerState) {
    PlayerState["Alive"] = "alive";
    PlayerState["Dead"] = "dead";
    PlayerState["Ejected"] = "ejected";
})(PlayerState || (exports.PlayerState = PlayerState = {}));
var GamePhase;
(function (GamePhase) {
    GamePhase["Lobby"] = "lobby";
    GamePhase["AssigningRoles"] = "assigningRoles";
    GamePhase["Playing"] = "playing";
    GamePhase["Meeting"] = "meeting";
    GamePhase["Voting"] = "voting";
    GamePhase["ResolvingVote"] = "resolvingVote";
    GamePhase["GameOver"] = "gameover";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
// Re-export map types and functions
__exportStar(require("./map"), exports);
exports.GAME_CONFIG = {
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
exports.COLORS = [
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
exports.DISPLAY_NAME_MIN_LENGTH = 1;
exports.DISPLAY_NAME_MAX_LENGTH = 24;
exports.DEFAULT_ACCOUNT_PREFERENCES = {
    soundEnabled: true,
};
function validateAccountProfileUpdate(value) {
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
        if (displayName.length < exports.DISPLAY_NAME_MIN_LENGTH ||
            displayName.length > exports.DISPLAY_NAME_MAX_LENGTH) {
            return {
                ok: false,
                message: `Display name must be ${exports.DISPLAY_NAME_MIN_LENGTH}-${exports.DISPLAY_NAME_MAX_LENGTH} characters`,
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
exports.MESSAGE_TYPES = {
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
