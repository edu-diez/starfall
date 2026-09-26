import { Schema, MapSchema, type, ArraySchema } from "@colyseus/schema";
import { PlayerState, GamePhase, Vec2, type Color } from "@starfall/shared";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  /** Safe public identifier only; credentials and account records remain private. */
  @type("string") accountId: string = "";
  @type("string") name: string = "";
  @type("string") color: Color = "#FF0000";
  @type("string") state: PlayerState = PlayerState.Alive;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") lastInputTimestamp: number = 0;
  @type("boolean") ready: boolean = false;
  @type("number") meetingsUsed: number = 0;
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase: GamePhase = GamePhase.Lobby;
  @type("number") matchStartTime: number = 0;
  @type("number") meetingEndTime: number = 0;
  @type("number") voteDeadline: number = 0;
  @type("number") voteResultsEndTime: number = 0;
  @type({ map: "boolean" }) voteSubmitted = new MapSchema<boolean>();
  @type({ map: "number" }) voteTotals = new MapSchema<number>();
  @type("number") abstainVotes: number = 0;
  @type("string") ejectedPlayerId: string | null = null;
  @type("string") ejectedPlayerRole: string | null = null;
  @type("string") winner: string | null = null;
  @type("string") endReason: string | null = null;

  createPlayer(
    sessionId: string,
    accountId: string,
    name: string,
    color: Color,
  ): Player {
    const player = new Player();
    player.sessionId = sessionId;
    player.accountId = accountId;
    player.name = name;
    player.color = color;
    player.x = 960; // Center of map
    player.y = 540;
    player.state = PlayerState.Alive;
    player.ready = false;
    return player;
  }
}
