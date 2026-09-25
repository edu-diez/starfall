"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const CollisionSystem_1 = require("./CollisionSystem");
const shared_1 = require("@starfall/shared");
const shared_2 = require("@starfall/shared");
(0, vitest_1.describe)("CollisionSystem", () => {
    let state;
    let collisionSystem;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        collisionSystem = new CollisionSystem_1.CollisionSystem(state);
    });
    (0, vitest_1.it)("validates position within map bounds", () => {
        // Center of map should be valid
        (0, vitest_1.expect)(collisionSystem.isPositionValid(960, 540)).toBe(true);
        // Outside left bound
        (0, vitest_1.expect)(collisionSystem.isPositionValid(-10, 540)).toBe(false);
        // Outside right bound
        (0, vitest_1.expect)(collisionSystem.isPositionValid(1930, 540)).toBe(false);
        // Outside top bound
        (0, vitest_1.expect)(collisionSystem.isPositionValid(960, -10)).toBe(false);
        // Outside bottom bound
        (0, vitest_1.expect)(collisionSystem.isPositionValid(960, 1090)).toBe(false);
    });
    (0, vitest_1.it)("rejects positions inside walls", () => {
        // Top wall at y=0 to y=20
        (0, vitest_1.expect)(collisionSystem.isPositionValid(960, 10)).toBe(false);
        // Left wall at x=0 to x=20
        (0, vitest_1.expect)(collisionSystem.isPositionValid(10, 540)).toBe(false);
        // Right wall at x=1900 to x=1920
        (0, vitest_1.expect)(collisionSystem.isPositionValid(1910, 540)).toBe(false);
        // Bottom wall at y=1060 to y=1080
        (0, vitest_1.expect)(collisionSystem.isPositionValid(960, 1070)).toBe(false);
    });
    (0, vitest_1.it)("allows positions in door openings", () => {
        // Bridge-corridor door at x=900-1020, y=250-270
        // This should be an opening in the wall
        (0, vitest_1.expect)(collisionSystem.isPositionValid(960, 260)).toBe(true);
    });
    (0, vitest_1.it)("validates movement that doesn't cross walls", () => {
        // Movement in open space
        (0, vitest_1.expect)(collisionSystem.isMovementValid(960, 540, 1000, 540)).toBe(true);
        (0, vitest_1.expect)(collisionSystem.isMovementValid(960, 540, 960, 580)).toBe(true);
    });
    (0, vitest_1.it)("rejects movement that crosses walls", () => {
        // Try to move from center through top wall
        (0, vitest_1.expect)(collisionSystem.isMovementValid(960, 540, 960, -10)).toBe(false);
        // Try to move from center through left wall
        (0, vitest_1.expect)(collisionSystem.isMovementValid(960, 540, -10, 540)).toBe(false);
    });
    (0, vitest_1.it)("allows movement through door openings", () => {
        // Move from corridor-north (y=340) through bridge-corridor door (y=250-270) to bridge (y=150)
        // The door is at y=250-270, so moving from y=340 to y=150 should pass through the door
        (0, vitest_1.expect)(collisionSystem.isMovementValid(960, 340, 960, 150)).toBe(true);
    });
    (0, vitest_1.it)("clamps invalid positions to nearest valid position", () => {
        // Position inside top wall
        const clamped = collisionSystem.clampToValidPosition(960, 10);
        (0, vitest_1.expect)(clamped.y).toBeGreaterThanOrEqual(shared_1.GAME_CONFIG.PLAYER_RADIUS);
        (0, vitest_1.expect)(collisionSystem.isPositionValid(clamped.x, clamped.y)).toBe(true);
    });
    (0, vitest_1.it)("returns valid spawn points", () => {
        const spawn = collisionSystem.getValidSpawnPoint();
        (0, vitest_1.expect)(collisionSystem.isPositionValid(spawn.x, spawn.y)).toBe(true);
        (0, vitest_1.expect)(spawn.x).toBeGreaterThanOrEqual(shared_1.GAME_CONFIG.PLAYER_RADIUS);
        (0, vitest_1.expect)(spawn.x).toBeLessThanOrEqual(shared_1.GAME_CONFIG.MAP_WIDTH - shared_1.GAME_CONFIG.PLAYER_RADIUS);
        (0, vitest_1.expect)(spawn.y).toBeGreaterThanOrEqual(shared_1.GAME_CONFIG.PLAYER_RADIUS);
        (0, vitest_1.expect)(spawn.y).toBeLessThanOrEqual(shared_1.GAME_CONFIG.MAP_HEIGHT - shared_1.GAME_CONFIG.PLAYER_RADIUS);
    });
    (0, vitest_1.it)("returns spawn points from predefined list", () => {
        const spawn = collisionSystem.getValidSpawnPoint();
        const isKnownSpawn = shared_2.STARFALL_MAP.spawnPoints.some((s) => s.x === spawn.x && s.y === spawn.y);
        // Should be one of the predefined spawn points or the fallback center
        (0, vitest_1.expect)(isKnownSpawn || (spawn.x === shared_1.GAME_CONFIG.MAP_WIDTH / 2 && spawn.y === shared_1.GAME_CONFIG.MAP_HEIGHT / 2)).toBe(true);
    });
    (0, vitest_1.it)("avoids spawn points occupied by other players", () => {
        // Add a player at the first spawn point (bridge)
        const player = new GameRoomState_1.Player();
        player.sessionId = "client-1";
        player.state = shared_1.PlayerState.Alive;
        const firstSpawnPoint = shared_2.STARFALL_MAP.spawnPoints[0];
        (0, vitest_1.expect)(firstSpawnPoint).toBeDefined();
        if (!firstSpawnPoint)
            return;
        player.x = firstSpawnPoint.x;
        player.y = firstSpawnPoint.y;
        state.players.set("client-1", player);
        // Verify player is in state
        (0, vitest_1.expect)(state.players.size).toBe(1);
        const statePlayer = state.players.get("client-1");
        (0, vitest_1.expect)(statePlayer).toBeDefined();
        if (statePlayer) {
            (0, vitest_1.expect)(statePlayer.x).toBe(firstSpawnPoint.x);
            (0, vitest_1.expect)(statePlayer.y).toBe(firstSpawnPoint.y);
        }
        // Get a spawn point - should not be the same as the occupied one
        const spawn = collisionSystem.getValidSpawnPoint();
        // Should be a valid spawn point
        (0, vitest_1.expect)(collisionSystem.isPositionValid(spawn.x, spawn.y)).toBe(true);
        // Should be one of the predefined spawn points OR the center fallback
        const isKnownSpawn = shared_2.STARFALL_MAP.spawnPoints.some((s) => s.x === spawn.x && s.y === spawn.y);
        const isCenterFallback = spawn.x === shared_1.GAME_CONFIG.MAP_WIDTH / 2 && spawn.y === shared_1.GAME_CONFIG.MAP_HEIGHT / 2;
        (0, vitest_1.expect)(isKnownSpawn || isCenterFallback).toBe(true);
        // Should not be the exact same spawn point (both x and y)
        const isOccupiedSpawn = spawn.x === firstSpawnPoint.x && spawn.y === firstSpawnPoint.y;
        (0, vitest_1.expect)(isOccupiedSpawn).toBe(false);
    });
    (0, vitest_1.it)("provides access to walls and doors for rendering", () => {
        const walls = collisionSystem.getWalls();
        const doors = collisionSystem.getDoors();
        (0, vitest_1.expect)(walls.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(doors.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(walls).toEqual(shared_2.STARFALL_MAP.walls);
        (0, vitest_1.expect)(doors).toEqual(shared_2.STARFALL_MAP.doors);
    });
    (0, vitest_1.it)("provides access to map definition", () => {
        const map = collisionSystem.getMapDefinition();
        (0, vitest_1.expect)(map).toBe(shared_2.STARFALL_MAP);
    });
});
(0, vitest_1.describe)("Map Geometry Utilities", () => {
    (0, vitest_1.it)("checks point in rectangle", () => {
        const { pointInRect } = require("@starfall/shared");
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        (0, vitest_1.expect)(pointInRect({ x: 50, y: 50 }, rect)).toBe(true);
        (0, vitest_1.expect)(pointInRect({ x: 0, y: 0 }, rect)).toBe(true);
        (0, vitest_1.expect)(pointInRect({ x: 100, y: 100 }, rect)).toBe(true);
        (0, vitest_1.expect)(pointInRect({ x: -1, y: 50 }, rect)).toBe(false);
        (0, vitest_1.expect)(pointInRect({ x: 50, y: 101 }, rect)).toBe(false);
    });
    (0, vitest_1.it)("checks circle-rectangle intersection", () => {
        const { circleRectIntersect } = require("@starfall/shared");
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        // Circle inside rect
        (0, vitest_1.expect)(circleRectIntersect(50, 50, 10, rect)).toBe(true);
        // Circle touching rect edge
        (0, vitest_1.expect)(circleRectIntersect(100, 50, 10, rect)).toBe(true);
        // Circle outside rect
        (0, vitest_1.expect)(circleRectIntersect(120, 50, 10, rect)).toBe(false);
        // Circle at corner
        (0, vitest_1.expect)(circleRectIntersect(110, 110, 10, rect)).toBe(false);
        (0, vitest_1.expect)(circleRectIntersect(105, 105, 10, rect)).toBe(true);
    });
    (0, vitest_1.it)("checks line-rectangle intersection", () => {
        const { lineRectIntersect } = require("@starfall/shared");
        const rect = { x: 0, y: 0, width: 100, height: 100 };
        // Line crossing rect
        (0, vitest_1.expect)(lineRectIntersect(-10, 50, 110, 50, rect)).toBe(true);
        // Line along edge
        (0, vitest_1.expect)(lineRectIntersect(-10, 0, 110, 0, rect)).toBe(true);
        // Line outside rect
        (0, vitest_1.expect)(lineRectIntersect(-10, -10, -5, -5, rect)).toBe(false);
        // Line starting inside rect
        (0, vitest_1.expect)(lineRectIntersect(50, 50, 150, 50, rect)).toBe(true);
    });
});
