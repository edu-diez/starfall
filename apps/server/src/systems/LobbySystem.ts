import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { GamePhase, PlayerState, GAME_CONFIG } from "@starfall/shared";
import { ColorSystem } from "./ColorSystem";

export class LobbySystem {
  private state: GameRoomState;
  private colorSystem: ColorSystem;

  constructor(state: GameRoomState) {
    this.state = state;
    this.colorSystem = new ColorSystem(state);
  }

  /**
   * Check if the room is in lobby phase
   */
  isInLobby(): boolean {
    return this.state.phase === GamePhase.Lobby;
  }

  /**
   * Get the minimum players required to start
   */
  getMinPlayers(): number {
    return GAME_CONFIG.MIN_PLAYERS;
  }

  /**
   * Get the maximum players allowed
   */
  getMaxPlayers(): number {
    return GAME_CONFIG.MAX_PLAYERS;
  }

  /**
   * Get current player count
   */
  getPlayerCount(): number {
    return this.state.players.size;
  }

  /**
   * Get alive player count
   */
  getAlivePlayerCount(): number {
    let count = 0;
    this.state.players.forEach((player) => {
      if (player.state === PlayerState.Alive) {
        count++;
      }
    });
    return count;
  }

  /**
   * Check if a player can join (room not full, in lobby)
   */
  canJoin(): boolean {
    return this.isInLobby() && this.getPlayerCount() < this.getMaxPlayers();
  }

  /**
   * Set a player's ready status
   * Returns true if successful, false if not in lobby or player not found
   */
  setReady(sessionId: string, ready: boolean): boolean {
    if (!this.isInLobby()) {
      return false;
    }

    const player = this.state.players.get(sessionId);
    if (!player) {
      return false;
    }

    player.ready = ready;
    return true;
  }

  /**
   * Get a player's ready status
   */
  getReady(sessionId: string): boolean | null {
    const player = this.state.players.get(sessionId);
    if (!player) {
      return null;
    }
    return player.ready;
  }

  /**
   * Check if the game can start
   * Requirements: minimum players met, all players ready
   */
  canStart(): boolean {
    if (!this.isInLobby()) {
      return false;
    }

    const alivePlayers = this.getAlivePlayerCount();
    if (alivePlayers < this.getMinPlayers()) {
      return false;
    }

    // All alive players must be ready
    let allReady = true;
    this.state.players.forEach((player) => {
      if (player.state === PlayerState.Alive && !player.ready) {
        allReady = false;
      }
    });

    return allReady;
  }

  /**
   * Get lobby state for synchronization
   */
  getLobbyState(): {
    players: Array<{
      sessionId: string;
      name: string;
      color: string;
      ready: boolean;
    }>;
    minPlayers: number;
    maxPlayers: number;
    canStart: boolean;
  } {
    const players: Array<{
      sessionId: string;
      name: string;
      color: string;
      ready: boolean;
    }> = [];

    this.state.players.forEach((player, sessionId) => {
      players.push({
        sessionId,
        name: player.name,
        color: player.color,
        ready: player.ready,
      });
    });

    return {
      players,
      minPlayers: this.getMinPlayers(),
      maxPlayers: this.getMaxPlayers(),
      canStart: this.canStart(),
    };
  }

  /**
   * Handle player joining - assign color
   */
  handlePlayerJoin(sessionId: string, name: string): string {
    const player = this.state.createPlayer(sessionId, name, "#FF0000"); // Temporary color
    this.state.players.set(sessionId, player);

    // Assign an available color
    this.colorSystem.assignColor(sessionId);

    return player.color;
  }

  /**
   * Handle player leaving - clean up
   */
  handlePlayerLeave(sessionId: string): void {
    this.state.players.delete(sessionId);
  }

  /**
   * Handle color change request
   * Returns the new color if successful, null if failed
   */
  handleColorChange(sessionId: string, requestedColor: string): string | null {
    if (!this.isInLobby()) {
      return null;
    }

    return this.colorSystem.assignColor(sessionId, requestedColor as any);
  }

  /**
   * Get the ColorSystem instance
   */
  getColorSystem(): ColorSystem {
    return this.colorSystem;
  }
}