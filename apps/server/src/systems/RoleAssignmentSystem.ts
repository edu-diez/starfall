import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { PlayerRole, PlayerState, GamePhase } from "@starfall/shared";

/**
 * Interface for injectable random source
 * Allows deterministic testing
 */
export interface RandomSource {
  random(): number;
  shuffle<T>(array: T[]): T[];
}

/**
 * Default random source using Math.random
 */
export class DefaultRandomSource implements RandomSource {
  random(): number {
    return Math.random();
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      const temp = result[i];
      result[i] = result[j]!;
      result[j] = temp!;
    }
    return result;
  }
}

/**
 * RoleAssignmentSystem handles private role assignment
 * Roles are never stored in public state - only delivered privately to each client
 */
export class RoleAssignmentSystem {
  private state: GameRoomState;
  private randomSource: RandomSource;

  // Private role map - never serialized to public state
  private roleMap = new Map<string, PlayerRole>();

  constructor(state: GameRoomState, randomSource?: RandomSource) {
    this.state = state;
    this.randomSource = randomSource || new DefaultRandomSource();
  }

  /**
   * Assign roles to all alive players in the lobby
   * Exactly one Killer, rest Crewmates
   * Returns a map of sessionId -> role for private delivery
   */
  assignRoles(): Map<string, PlayerRole> {
    // Clear previous assignments
    this.roleMap.clear();

    // Get all alive players
    const alivePlayers: Array<{ sessionId: string; player: Player }> = [];
    this.state.players.forEach((player, sessionId) => {
      if (player.state === PlayerState.Alive) {
        alivePlayers.push({ sessionId, player });
      }
    });

    if (alivePlayers.length === 0) {
      return this.roleMap;
    }

    // Shuffle players for random assignment
    const shuffled = this.randomSource.shuffle(alivePlayers);

    // Assign exactly one Killer (first in shuffled array)
    // Rest are Crewmates
    shuffled.forEach((entry, index) => {
      const role = index === 0 ? PlayerRole.Killer : PlayerRole.Crewmate;
      this.roleMap.set(entry.sessionId, role);
    });

    return new Map(this.roleMap); // Return copy for private delivery
  }

  /**
   * Get the role for a specific player (private access)
   */
  getRole(sessionId: string): PlayerRole | undefined {
    return this.roleMap.get(sessionId);
  }

  /**
   * Check if a player is the Killer (private access)
   */
  isKiller(sessionId: string): boolean {
    return this.roleMap.get(sessionId) === PlayerRole.Killer;
  }

  /**
   * Get all role assignments (for testing/debugging only)
   * Should not be used for network synchronization
   */
  getAllRoles(): Map<string, PlayerRole> {
    return new Map(this.roleMap);
  }

  /**
   * Get the count of Killers assigned
   */
  getKillerCount(): number {
    let count = 0;
    this.roleMap.forEach((role) => {
      if (role === PlayerRole.Killer) count++;
    });
    return count;
  }

  /**
   * Get the count of Crewmates assigned
   */
  getCrewmateCount(): number {
    let count = 0;
    this.roleMap.forEach((role) => {
      if (role === PlayerRole.Crewmate) count++;
    });
    return count;
  }

  /**
   * Validate that role assignment is correct
   * Exactly one Killer, all alive players assigned
   */
  validateAssignment(): boolean {
    const aliveCount = this.getAlivePlayerCount();
    if (aliveCount === 0) return false;

    const killerCount = this.getKillerCount();
    const crewmateCount = this.getCrewmateCount();

    return (
      killerCount === 1 &&
      crewmateCount === aliveCount - 1 &&
      this.roleMap.size === aliveCount
    );
  }

  /**
   * Get count of alive players
   */
  private getAlivePlayerCount(): number {
    let count = 0;
    this.state.players.forEach((player) => {
      if (player.state === PlayerState.Alive) {
        count++;
      }
    });
    return count;
  }

  /**
   * Clear all role assignments
   */
  clearRoles(): void {
    this.roleMap.clear();
  }

  /** Remove all private role state for a permanently departed player. */
  clearPlayer(sessionId: string): void {
    this.roleMap.delete(sessionId);
  }

  /**
   * Set a custom random source (for testing)
   */
  setRandomSource(randomSource: RandomSource): void {
    this.randomSource = randomSource;
  }
}
