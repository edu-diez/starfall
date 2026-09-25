import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { PlayerRole, PlayerState, GamePhase, GAME_CONFIG, Vec2 } from "@starfall/shared";
import { RoleAssignmentSystem } from "./RoleAssignmentSystem";

/**
 * Interface for injectable clock
 * Allows deterministic testing of cooldowns and timers
 */
export interface Clock {
  now(): number;
}

/**
 * Default clock using Date.now()
 */
export class DefaultClock implements Clock {
  now(): number {
    return Date.now();
  }
}

/**
 * KillSystem handles authoritative kill validation and elimination
 * All kill logic is server-side only
 */
export class KillSystem {
  private state: GameRoomState;
  private roleAssignmentSystem: RoleAssignmentSystem;
  private clock: Clock;

  // Private kill cooldown tracking per player (server-only)
  private killCooldownUntil = new Map<string, number>();

  constructor(
    state: GameRoomState,
    roleAssignmentSystem: RoleAssignmentSystem,
    clock?: Clock
  ) {
    this.state = state;
    this.roleAssignmentSystem = roleAssignmentSystem;
    this.clock = clock || new DefaultClock();
  }

  /**
   * Attempt to perform a kill
   * Returns result with success status and optional error reason
   */
  attemptKill(killerSessionId: string, targetSessionId: string): KillResult {
    // Validate phase - only allowed during playing
    if (this.state.phase !== GamePhase.Playing) {
      return { success: false, reason: "Kill only allowed during playing phase" };
    }

    // Validate killer exists and is alive
    const killer = this.state.players.get(killerSessionId);
    if (!killer) {
      return { success: false, reason: "Killer not found" };
    }
    if (killer.state !== PlayerState.Alive) {
      return { success: false, reason: "Killer is not alive" };
    }

    // Validate killer has Killer role
    if (!this.roleAssignmentSystem.isKiller(killerSessionId)) {
      return { success: false, reason: "Only the Killer can kill" };
    }

    // Validate target exists and is alive
    const target = this.state.players.get(targetSessionId);
    if (!target) {
      return { success: false, reason: "Target not found" };
    }
    if (target.state !== PlayerState.Alive) {
      return { success: false, reason: "Target is not alive" };
    }

    // Cannot target self
    if (killerSessionId === targetSessionId) {
      return { success: false, reason: "Cannot target self" };
    }

    // Check kill range
    const distance = this.calculateDistance(killer, target);
    if (distance > GAME_CONFIG.KILL_RANGE) {
      return { success: false, reason: "Target out of range" };
    }

    // Check kill cooldown
    const cooldownUntil = this.killCooldownUntil.get(killerSessionId) || 0;
    const now = this.clock.now();
    if (now < cooldownUntil) {
      return { success: false, reason: "Kill on cooldown" };
    }

    // All validations passed - perform the kill
    this.performKill(killerSessionId, targetSessionId);

    return { success: true };
  }

  /**
   * Perform the actual kill - eliminate target and start cooldown
   */
  private performKill(killerSessionId: string, targetSessionId: string): void {
    const target = this.state.players.get(targetSessionId);
    if (!target) return;

    // Mark target as dead
    target.state = PlayerState.Dead;

    // Set kill cooldown for killer
    const now = this.clock.now();
    this.killCooldownUntil.set(killerSessionId, now + GAME_CONFIG.KILL_COOLDOWN * 1000);
  }

  /**
   * Calculate distance between two players
   */
  private calculateDistance(player1: Player, player2: Player): number {
    const dx = player1.x - player2.x;
    const dy = player1.y - player2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get remaining cooldown time for a player (in milliseconds)
   * Returns 0 if no cooldown active
   */
  getCooldownRemaining(sessionId: string): number {
    const cooldownUntil = this.killCooldownUntil.get(sessionId) || 0;
    const now = this.clock.now();
    return Math.max(0, cooldownUntil - now);
  }

  /**
   * Check if a player can currently kill (cooldown expired)
   */
  canKill(sessionId: string): boolean {
    return this.getCooldownRemaining(sessionId) === 0;
  }

  /**
   * Get the kill cooldown configuration (for client display)
   */
  getKillCooldown(): number {
    return GAME_CONFIG.KILL_COOLDOWN;
  }

  /**
   * Get the kill range configuration (for client display)
   */
  getKillRange(): number {
    return GAME_CONFIG.KILL_RANGE;
  }

  /**
   * Clear cooldown for a player (e.g., on match reset)
   */
  clearCooldown(sessionId: string): void {
    this.killCooldownUntil.delete(sessionId);
  }

  /**
   * Clear all cooldowns (e.g., on match reset)
   */
  clearAllCooldowns(): void {
    this.killCooldownUntil.clear();
  }

  /**
   * Set a custom clock (for testing)
   */
  setClock(clock: Clock): void {
    this.clock = clock;
  }
}

/**
 * Result of a kill attempt
 */
export interface KillResult {
  success: boolean;
  reason?: string;
}