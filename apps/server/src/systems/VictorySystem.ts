import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { PlayerRole, PlayerState, GamePhase } from "@starfall/shared";
import { RoleAssignmentSystem } from "./RoleAssignmentSystem";

/**
 * VictorySystem evaluates win conditions
 * It is the ONLY system that determines match winners
 */
export class VictorySystem {
  private state: GameRoomState;
  private roleAssignmentSystem: RoleAssignmentSystem;

  // Winner and end reason (set when match ends)
  private winner: PlayerRole | null = null;
  private endReason: string | null = null;

  constructor(
    state: GameRoomState,
    roleAssignmentSystem: RoleAssignmentSystem,
  ) {
    this.state = state;
    this.roleAssignmentSystem = roleAssignmentSystem;
  }

  /**
   * Evaluate victory conditions after any state change that could end the match
   * Returns true if the match has ended, false otherwise
   */
  evaluate(): boolean {
    return this.evaluateForPhase(false);
  }

  /** Evaluate a permanent departure without bypassing VictorySystem ownership. */
  evaluateAfterDeparture(): boolean {
    return this.evaluateForPhase(true);
  }

  private evaluateForPhase(allowActiveMatchPhase: boolean): boolean {
    const isNormalEvaluationPhase =
      this.state.phase === GamePhase.Playing ||
      this.state.phase === GamePhase.ResolvingVote;
    const isDepartureEvaluationPhase =
      this.state.phase === GamePhase.Meeting ||
      this.state.phase === GamePhase.Voting;
    if (
      !isNormalEvaluationPhase &&
      !(allowActiveMatchPhase && isDepartureEvaluationPhase)
    ) {
      return false;
    }

    const livingCounts = this.getLivingRoleCounts();

    // Killer victory: Living Killers >= Living Crewmates
    if (
      livingCounts.killers >= livingCounts.crewmates &&
      livingCounts.killers > 0
    ) {
      this.setWinner(PlayerRole.Killer, "Killer reached parity with Crewmates");
      return true;
    }

    // Crewmate victory: No living Killers (Killer was ejected or eliminated)
    if (livingCounts.killers === 0 && livingCounts.crewmates > 0) {
      this.setWinner(PlayerRole.Crewmate, "All Killers eliminated");
      return true;
    }

    // No winner yet
    return false;
  }

  /**
   * Get living player counts by role
   */
  private getLivingRoleCounts(): { killers: number; crewmates: number } {
    let killers = 0;
    let crewmates = 0;

    this.state.players.forEach((player, sessionId) => {
      if (player.state !== PlayerState.Alive) return;

      const role = this.roleAssignmentSystem.getRole(sessionId);
      if (role === PlayerRole.Killer) {
        killers++;
      } else if (role === PlayerRole.Crewmate) {
        crewmates++;
      }
    });

    return { killers, crewmates };
  }

  /**
   * Set the winner and end reason, transition to GameOver phase
   */
  private setWinner(role: PlayerRole, reason: string): void {
    this.winner = role;
    this.endReason = reason;
    this.state.phase = GamePhase.GameOver;
  }

  /**
   * Get the current winner (null if match not ended)
   */
  getWinner(): PlayerRole | null {
    return this.winner;
  }

  /**
   * Get the end reason (null if match not ended)
   */
  getEndReason(): string | null {
    return this.endReason;
  }

  /**
   * Check if the match has ended
   */
  isMatchEnded(): boolean {
    return this.state.phase === GamePhase.GameOver;
  }

  /**
   * Reset victory state for a new match
   */
  reset(): void {
    this.winner = null;
    this.endReason = null;
    // Reset phase back to Playing if it was GameOver
    if (this.state.phase === GamePhase.GameOver) {
      this.state.phase = GamePhase.Playing;
    }
  }

  /**
   * Force end the match with a specific winner (for testing/admin)
   */
  forceEnd(role: PlayerRole, reason: string): void {
    this.setWinner(role, reason);
  }
}
