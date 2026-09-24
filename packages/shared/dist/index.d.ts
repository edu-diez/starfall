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
export declare const COLORS: readonly ["#FF0000", "#0000FF", "#00FF00", "#FFD700", "#FF69B4", "#FFA500", "#800080", "#00FFFF", "#FFFFFF", "#8B4513"];
export type Color = (typeof COLORS)[number];
//# sourceMappingURL=index.d.ts.map