import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { COLORS, Color } from "@starfall/shared";

export class ColorSystem {
  private state: GameRoomState;

  constructor(state: GameRoomState) {
    this.state = state;
  }

  /**
   * Get all currently used colors in the lobby
   */
  getUsedColors(): Set<Color> {
    const used = new Set<Color>();
    this.state.players.forEach((player) => {
      used.add(player.color);
    });
    return used;
  }

  /**
   * Get the first available color from the catalog
   */
  getAvailableColor(): Color {
    const usedColors = this.getUsedColors();
    for (const color of COLORS) {
      if (!usedColors.has(color)) {
        return color;
      }
    }
    // Fallback - should not happen if max players <= COLORS.length
    return COLORS[0];
  }

  /**
   * Check if a color is available for assignment
   */
  isColorAvailable(color: Color, excludeSessionId?: string): boolean {
    for (const [sessionId, player] of this.state.players) {
      if (sessionId !== excludeSessionId && player.color === color) {
        return false;
      }
    }
    return true;
  }

  /**
   * Assign a color to a player
   * Returns the assigned color, or null if the color is not available
   */
  assignColor(sessionId: string, requestedColor?: Color): Color | null {
    const player = this.state.players.get(sessionId);
    if (!player) {
      return null;
    }

    // If a specific color is requested, validate it
    if (requestedColor) {
      if (!COLORS.includes(requestedColor)) {
        return null; // Unknown color
      }
      if (!this.isColorAvailable(requestedColor, sessionId)) {
        return null; // Color already taken
      }
      player.color = requestedColor;
      return requestedColor;
    }

    // Auto-assign an available color
    const availableColor = this.getAvailableColor();
    player.color = availableColor;
    return availableColor;
  }

  /**
   * Release a player's color (when they leave)
   */
  releaseColor(sessionId: string): void {
    // Color is automatically released when player is removed from state
    // This method exists for explicit release if needed
  }

  /**
   * Get all available colors for UI display
   */
  getAllColors(): readonly Color[] {
    return COLORS;
  }

  /**
   * Get color availability status for all colors
   */
  getColorAvailability(): Map<Color, { available: boolean; owner?: string }> {
    const availability = new Map<Color, { available: boolean; owner?: string }>();
    const usedColors = new Map<Color, string>();

    this.state.players.forEach((player, sessionId) => {
      usedColors.set(player.color, sessionId);
    });

    for (const color of COLORS) {
      const owner = usedColors.get(color);
      availability.set(color, {
        available: !owner,
        owner,
      });
    }

    return availability;
  }
}