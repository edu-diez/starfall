import { GameRoomState } from "../rooms/schema/GameRoomState";
import { Vec2 } from "@starfall/shared";
import { CollisionRect, Door } from "@starfall/shared";
/**
 * CollisionSystem handles authoritative collision detection
 * for player movement against map boundaries and walls
 */
export declare class CollisionSystem {
    private state;
    private walls;
    private doors;
    private playerRadius;
    constructor(state: GameRoomState);
    /**
     * Check if a position is valid (not colliding with walls)
     * Doors are treated as passable openings
     */
    isPositionValid(x: number, y: number): boolean;
    /**
     * Check if movement from current position to new position is valid
     * Uses line-rectangle intersection to detect wall crossing
     */
    isMovementValid(currentX: number, currentY: number, newX: number, newY: number): boolean;
    /**
     * Check if a line segment passes through any door opening
     * This allows movement through doorways
     */
    private linePassesThroughDoor;
    /**
     * Check if two rectangles overlap
     */
    private rectsOverlap;
    /**
     * Get a valid position by clamping to nearest valid position
     * Used for correcting positions that are slightly out of bounds
     */
    clampToValidPosition(x: number, y: number): Vec2;
    /**
     * Get a valid spawn point for a new player
     * Returns a position that doesn't collide with walls or other players
     */
    getValidSpawnPoint(): Vec2;
    /**
     * Get all walls (for debugging/rendering)
     */
    getWalls(): CollisionRect[];
    /**
     * Get all doors (for debugging/rendering)
     */
    getDoors(): Door[];
    /**
     * Get the map definition
     */
    getMapDefinition(): import("@starfall/shared").MapDefinition;
}
//# sourceMappingURL=CollisionSystem.d.ts.map