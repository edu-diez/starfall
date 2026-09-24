import { GameRoomState } from "../rooms/schema/GameRoomState";
import { Color } from "@starfall/shared";
export declare class ColorSystem {
    private state;
    constructor(state: GameRoomState);
    /**
     * Get all currently used colors in the lobby
     */
    getUsedColors(): Set<Color>;
    /**
     * Get the first available color from the catalog
     */
    getAvailableColor(): Color;
    /**
     * Check if a color is available for assignment
     */
    isColorAvailable(color: Color, excludeSessionId?: string): boolean;
    /**
     * Assign a color to a player
     * Returns the assigned color, or null if the color is not available
     */
    assignColor(sessionId: string, requestedColor?: Color): Color | null;
    /**
     * Release a player's color (when they leave)
     */
    releaseColor(sessionId: string): void;
    /**
     * Get all available colors for UI display
     */
    getAllColors(): readonly Color[];
    /**
     * Get color availability status for all colors
     */
    getColorAvailability(): Map<Color, {
        available: boolean;
        owner?: string;
    }>;
}
//# sourceMappingURL=ColorSystem.d.ts.map