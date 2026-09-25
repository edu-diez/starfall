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
    readonly MAX_PLAYERS: 10;
    readonly MIN_PLAYERS: 4;
};
export declare const COLORS: readonly ["#FF0000", "#0000FF", "#00FF00", "#FFD700", "#FF69B4", "#FFA500", "#800080", "#00FFFF", "#FFFFFF", "#8B4513", "#FF4500", "#32CD32", "#1E90FF", "#FF1493", "#FF8C00", "#9932CC", "#00CED1", "#ADFF2F", "#FF6347", "#40E0D0", "#DA70D6"];
export type Color = (typeof COLORS)[number];
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
};
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
//# sourceMappingURL=index.d.ts.map