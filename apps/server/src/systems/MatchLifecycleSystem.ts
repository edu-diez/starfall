import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { GamePhase, PlayerState, GAME_CONFIG } from "@starfall/shared";
import { LobbySystem } from "./LobbySystem";

export class MatchLifecycleSystem {
  private state: GameRoomState;
  private lobbySystem: LobbySystem;
  private matchId: number = 0;

  constructor(state: GameRoomState, lobbySystem: LobbySystem) {
    this.state = state;
    this.lobbySystem = lobbySystem;
  }

  /**
   * Get the current match ID
   */
  getMatchId(): number {
    return this.matchId;
  }

  /**
   * Check if the room is in a valid phase for match start
   */
  canStartMatch(): boolean {
    return this.lobbySystem.canStart();
  }

  /**
   * Start the match - transitions from Lobby to AssigningRoles
   * Returns true if successful, false if not in lobby or requirements not met
   */
  startMatch(): boolean {
    if (!this.canStartMatch()) {
      return false;
    }

    // Transition to AssigningRoles phase
    this.state.phase = GamePhase.AssigningRoles;
    this.matchId++;
    this.state.matchStartTime = Date.now();

    return true;
  }

  /**
   * Complete role assignment and transition to Playing phase
   */
  completeRoleAssignment(): void {
    if (this.state.phase !== GamePhase.AssigningRoles) {
      return;
    }

    this.state.phase = GamePhase.Playing;
  }

  /**
   * End the match and transition to GameOver phase
   */
  endMatch(): void {
    this.state.phase = GamePhase.GameOver;
  }

  /**
   * Reset the match for a new game (administrative reset)
   * Returns to Lobby phase
   */
  resetMatch(): void {
    this.state.phase = GamePhase.Lobby;
    this.state.matchStartTime = 0;
    this.state.meetingEndTime = 0;
    this.state.winner = null;
    this.state.endReason = null;

    // Reset all players to alive and unready
    this.state.players.forEach((player) => {
      player.state = PlayerState.Alive;
      player.ready = false;
      player.x = GAME_CONFIG.MAP_WIDTH / 2;
      player.y = GAME_CONFIG.MAP_HEIGHT / 2;
    });
  }

  /**
   * Get the current phase
   */
  getPhase(): GamePhase {
    return this.state.phase;
  }

  /**
   * Check if the match is in progress (playing or meeting)
   */
  isMatchInProgress(): boolean {
    return (
      this.state.phase === GamePhase.Playing ||
      this.state.phase === GamePhase.Meeting
    );
  }

  /**
   * Check if roles are being assigned
   */
  isAssigningRoles(): boolean {
    return this.state.phase === GamePhase.AssigningRoles;
  }

  /**
   * Check if in lobby
   */
  isInLobby(): boolean {
    return this.state.phase === GamePhase.Lobby;
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.state.phase === GamePhase.GameOver;
  }
}