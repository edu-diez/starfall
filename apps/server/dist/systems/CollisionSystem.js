"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollisionSystem = void 0;
const shared_1 = require("@starfall/shared");
const shared_2 = require("@starfall/shared");
/**
 * CollisionSystem handles authoritative collision detection
 * for player movement against map boundaries and walls
 */
class CollisionSystem {
    state;
    walls;
    doors;
    playerRadius;
    constructor(state) {
        this.state = state;
        this.walls = (0, shared_2.getMapWalls)(shared_2.STARFALL_MAP);
        this.doors = (0, shared_2.getMapDoors)(shared_2.STARFALL_MAP);
        this.playerRadius = shared_1.GAME_CONFIG.PLAYER_RADIUS;
    }
    /**
     * Check if a position is valid (not colliding with walls)
     * Doors are treated as passable openings
     */
    isPositionValid(x, y) {
        // Check against all walls
        for (const wall of this.walls) {
            if ((0, shared_2.circleRectIntersect)(x, y, this.playerRadius, wall)) {
                return false;
            }
        }
        // Check if position is within map bounds
        if (x < this.playerRadius || x > shared_1.GAME_CONFIG.MAP_WIDTH - this.playerRadius) {
            return false;
        }
        if (y < this.playerRadius || y > shared_1.GAME_CONFIG.MAP_HEIGHT - this.playerRadius) {
            return false;
        }
        return true;
    }
    /**
     * Check if movement from current position to new position is valid
     * Uses line-rectangle intersection to detect wall crossing
     */
    isMovementValid(currentX, currentY, newX, newY) {
        // If the new position itself is invalid, reject
        if (!this.isPositionValid(newX, newY)) {
            return false;
        }
        // Check if the movement line crosses any wall
        // Doors are excluded from collision checks (they're openings)
        for (const wall of this.walls) {
            // Skip collision check if the line passes through a door
            if (this.linePassesThroughDoor(currentX, currentY, newX, newY, wall)) {
                continue;
            }
            if ((0, shared_2.lineRectIntersect)(currentX, currentY, newX, newY, wall)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if a line segment passes through any door opening
     * This allows movement through doorways
     */
    linePassesThroughDoor(x1, y1, x2, y2, wall) {
        for (const door of this.doors) {
            if (!door.isOpen)
                continue;
            // Check if the door overlaps with this wall
            // If so, the door creates an opening in this wall
            const doorRect = {
                x: door.x,
                y: door.y,
                width: door.width,
                height: door.height,
            };
            // Check if wall and door overlap
            if (this.rectsOverlap(wall, doorRect)) {
                // Check if the movement line passes through the door opening
                if ((0, shared_2.lineRectIntersect)(x1, y1, x2, y2, doorRect)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if two rectangles overlap
     */
    rectsOverlap(a, b) {
        return (a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y);
    }
    /**
     * Get a valid position by clamping to nearest valid position
     * Used for correcting positions that are slightly out of bounds
     */
    clampToValidPosition(x, y) {
        let clampedX = Math.max(this.playerRadius, Math.min(shared_1.GAME_CONFIG.MAP_WIDTH - this.playerRadius, x));
        let clampedY = Math.max(this.playerRadius, Math.min(shared_1.GAME_CONFIG.MAP_HEIGHT - this.playerRadius, y));
        // If position is valid, return it
        if (this.isPositionValid(clampedX, clampedY)) {
            return { x: clampedX, y: clampedY };
        }
        // Try a few candidate positions around the clamped position
        // to find a valid one (for minor corrections only)
        const candidates = [
            { x: clampedX, y: clampedY },
            { x: clampedX + this.playerRadius, y: clampedY },
            { x: clampedX - this.playerRadius, y: clampedY },
            { x: clampedX, y: clampedY + this.playerRadius },
            { x: clampedX, y: clampedY - this.playerRadius },
            { x: clampedX + this.playerRadius, y: clampedY + this.playerRadius },
            { x: clampedX - this.playerRadius, y: clampedY - this.playerRadius },
            { x: clampedX + this.playerRadius, y: clampedY - this.playerRadius },
            { x: clampedX - this.playerRadius, y: clampedY + this.playerRadius },
        ];
        for (const candidate of candidates) {
            // Clamp candidate to map bounds
            const cx = Math.max(this.playerRadius, Math.min(shared_1.GAME_CONFIG.MAP_WIDTH - this.playerRadius, candidate.x));
            const cy = Math.max(this.playerRadius, Math.min(shared_1.GAME_CONFIG.MAP_HEIGHT - this.playerRadius, candidate.y));
            if (this.isPositionValid(cx, cy)) {
                return { x: cx, y: cy };
            }
        }
        // Fallback: return center of map (should always be valid in central corridor)
        return {
            x: shared_1.GAME_CONFIG.MAP_WIDTH / 2,
            y: shared_1.GAME_CONFIG.MAP_HEIGHT / 2,
        };
    }
    /**
     * Get a valid spawn point for a new player
     * Returns a position that doesn't collide with walls or other players
     */
    getValidSpawnPoint() {
        const spawnPoints = shared_2.STARFALL_MAP.spawnPoints;
        // Try each spawn point
        for (const spawn of spawnPoints) {
            if (this.isPositionValid(spawn.x, spawn.y)) {
                // Check if any player is too close
                let tooClose = false;
                this.state.players.forEach((player) => {
                    if (player.state === shared_1.PlayerState.Alive) {
                        const dx = player.x - spawn.x;
                        const dy = player.y - spawn.y;
                        const distSq = dx * dx + dy * dy;
                        const minDist = this.playerRadius * 4; // Minimum 4 radii apart
                        if (distSq < minDist * minDist) {
                            tooClose = true;
                        }
                    }
                });
                if (!tooClose) {
                    return { x: spawn.x, y: spawn.y };
                }
            }
        }
        // If all spawn points are occupied or invalid, find a position near center
        // that doesn't collide with walls or players
        const centerX = shared_1.GAME_CONFIG.MAP_WIDTH / 2;
        const centerY = shared_1.GAME_CONFIG.MAP_HEIGHT / 2;
        if (this.isPositionValid(centerX, centerY)) {
            let tooClose = false;
            this.state.players.forEach((player) => {
                if (player.state === shared_1.PlayerState.Alive) {
                    const dx = player.x - centerX;
                    const dy = player.y - centerY;
                    const distSq = dx * dx + dy * dy;
                    const minDist = this.playerRadius * 4;
                    if (distSq < minDist * minDist) {
                        tooClose = true;
                    }
                }
            });
            if (!tooClose) {
                return { x: centerX, y: centerY };
            }
        }
        // Last resort: return center anyway (will be clamped by collision system)
        return {
            x: shared_1.GAME_CONFIG.MAP_WIDTH / 2,
            y: shared_1.GAME_CONFIG.MAP_HEIGHT / 2,
        };
    }
    /**
     * Get all walls (for debugging/rendering)
     */
    getWalls() {
        return this.walls;
    }
    /**
     * Get all doors (for debugging/rendering)
     */
    getDoors() {
        return this.doors;
    }
    /**
     * Get the map definition
     */
    getMapDefinition() {
        return shared_2.STARFALL_MAP;
    }
}
exports.CollisionSystem = CollisionSystem;
