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
] as const;

export type Color = (typeof COLORS)[number];