import { Room, Client } from "colyseus";
import { GameRoomState } from "./schema/GameRoomState";
import { PlayerRole, GamePhase, PlayerState, Vec2, GAME_CONFIG, COLORS, Color } from "@starfall/shared";

export class GameRoom extends Room<GameRoomState> {
  override maxClients = GAME_CONFIG.MAX_PLAYERS;

  override onCreate(options: any) {
    this.setState(new GameRoomState());
    this.state.phase = GamePhase.Lobby;

    this.onMessage("join", (client: Client, message: any) => {
      this.handleJoin(client, message);
    });

    this.onMessage("leave", (client: Client) => {
      this.handleLeave(client);
    });
  }

  override onJoin(client: Client, options: any) {
    console.log(`Client ${client.sessionId} joined`);
  }

  override onLeave(client: Client, consented: boolean) {
    console.log(`Client ${client.sessionId} left`);
    this.handleLeave(client);
  }

  override onDispose() {
    console.log("Room disposed");
  }

  private handleJoin(client: Client, message: any) {
    const playerName = message?.name || `Player ${client.sessionId.slice(0, 4)}`;
    
    // Check if player already exists
    if (this.state.players.has(client.sessionId)) {
      return;
    }

    // Check max players
    if (this.state.players.size >= this.maxClients) {
      client.send("error", { message: "Room is full" });
      return;
    }

    // Assign a color
    const usedColors = new Set<string>();
    this.state.players.forEach((player) => usedColors.add(player.color));
    
    let assignedColor: Color = "#FF0000";
    for (const color of COLORS) {
      if (!usedColors.has(color)) {
        assignedColor = color;
        break;
      }
    }

    // Create player
    const player = this.state.createPlayer(client.sessionId, playerName, assignedColor);
    this.state.players.set(client.sessionId, player);

    // Send welcome message with private role (will be assigned later)
    client.send("welcome", {
      sessionId: client.sessionId,
      playerId: client.sessionId,
      color: assignedColor,
      phase: this.state.phase,
    });

    // Broadcast player joined to others
    this.broadcast("playerJoined", {
      sessionId: client.sessionId,
      name: playerName,
      color: assignedColor,
    }, { except: client });
  }

  private handleLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.state.players.delete(client.sessionId);
      this.broadcast("playerLeft", { sessionId: client.sessionId });
    }
  }
}