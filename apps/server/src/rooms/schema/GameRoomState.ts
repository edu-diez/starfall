import { Schema, MapSchema, type, ArraySchema } from "@colyseus/schema";
import {
  PlayerRole,
  PlayerState,
  GamePhase,
  Vec2,
  type Color,
} from "@starfall/shared";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("string") color: Color = "#FF0000";
  @type("string") role: PlayerRole = PlayerRole.Crewmate;
  @type("string") state: PlayerState = PlayerState.Alive;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") lastInputTimestamp: number = 0;
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase: GamePhase = GamePhase.Lobby;
  @type("number") matchStartTime: number = 0;
  @type("number") meetingEndTime: number = 0;

  createPlayer(sessionId: string, name: string, color: Color): Player {
    const player = new Player();
    player.sessionId = sessionId;
    player.name = name;
    player.color = color;
    player.x = 960; // Center of map
    player.y = 540;
    return player;
  }
}
