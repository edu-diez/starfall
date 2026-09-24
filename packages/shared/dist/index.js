"use strict";
// Shared types and constants for the game
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_TYPES = exports.COLORS = exports.GAME_CONFIG = exports.GamePhase = exports.PlayerState = exports.PlayerRole = void 0;
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
    GamePhase["Playing"] = "playing";
    GamePhase["Meeting"] = "meeting";
    GamePhase["GameOver"] = "gameover";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
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
];
// Network message types
exports.MESSAGE_TYPES = {
    JOIN: "join",
    LEAVE: "leave",
    MOVE: "move",
    WELCOME: "welcome",
    PLAYER_JOINED: "playerJoined",
    PLAYER_LEFT: "playerLeft",
    ERROR: "error",
};
