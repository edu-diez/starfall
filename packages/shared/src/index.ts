// Shared types and constants for the game

export enum PlayerRole {
  Crewmate = "crewmate",
  Killer = "killer",
}

export enum PlayerState {
  Alive = "alive",
  Dead = "dead",
  Ejected = "ejected",
}

export enum GamePhase {
  Lobby = "lobby",
  AssigningRoles = "assigningRoles",
  Playing = "playing",
  Meeting = "meeting",
  GameOver = "gameover",
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerInput {
  direction: Vec2;
  timestamp: number;
}

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
  MAX_PLAYERS: 10,
  MIN_PLAYERS: 4,
} as const;

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
] as const;

export type Color = (typeof COLORS)[number];

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
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export interface MoveMessage {
  direction: Vec2;
  timestamp: number;
}

export interface JoinMessage {
  name?: string;
}

export interface WelcomeMessage {
  sessionId: string;
  playerId: string;
  color: Color;
  phase: GamePhase;
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
