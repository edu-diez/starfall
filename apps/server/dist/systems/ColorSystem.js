"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorSystem = void 0;
const shared_1 = require("@starfall/shared");
class ColorSystem {
    state;
    constructor(state) {
        this.state = state;
    }
    /**
     * Get all currently used colors in the lobby
     */
    getUsedColors() {
        const used = new Set();
        this.state.players.forEach((player) => {
            used.add(player.color);
        });
        return used;
    }
    /**
     * Get the first available color from the catalog
     */
    getAvailableColor() {
        const usedColors = this.getUsedColors();
        for (const color of shared_1.COLORS) {
            if (!usedColors.has(color)) {
                return color;
            }
        }
        // Fallback - should not happen if max players <= COLORS.length
        return shared_1.COLORS[0];
    }
    /**
     * Check if a color is available for assignment
     */
    isColorAvailable(color, excludeSessionId) {
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
    assignColor(sessionId, requestedColor) {
        const player = this.state.players.get(sessionId);
        if (!player) {
            return null;
        }
        // If a specific color is requested, validate it
        if (requestedColor) {
            if (!shared_1.COLORS.includes(requestedColor)) {
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
    releaseColor(sessionId) {
        // Color is automatically released when player is removed from state
        // This method exists for explicit release if needed
    }
    /**
     * Get all available colors for UI display
     */
    getAllColors() {
        return shared_1.COLORS;
    }
    /**
     * Get color availability status for all colors
     */
    getColorAvailability() {
        const availability = new Map();
        const usedColors = new Map();
        this.state.players.forEach((player, sessionId) => {
            usedColors.set(player.color, sessionId);
        });
        for (const color of shared_1.COLORS) {
            const owner = usedColors.get(color);
            availability.set(color, {
                available: !owner,
                owner,
            });
        }
        return availability;
    }
}
exports.ColorSystem = ColorSystem;
