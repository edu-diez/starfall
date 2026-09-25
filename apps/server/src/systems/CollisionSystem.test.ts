import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { CollisionSystem } from "./CollisionSystem";
import { PlayerState, GAME_CONFIG, Vec2 } from "@starfall/shared";
import { STARFALL_MAP } from "@starfall/shared";

describe("CollisionSystem", () => {
  let state: GameRoomState;
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    state = new GameRoomState();
    collisionSystem = new CollisionSystem(state);
  });

  it("validates position within map bounds", () => {
    // Center of map should be valid
    expect(collisionSystem.isPositionValid(960, 540)).toBe(true);

    // Outside left bound
    expect(collisionSystem.isPositionValid(-10, 540)).toBe(false);

    // Outside right bound
    expect(collisionSystem.isPositionValid(1930, 540)).toBe(false);

    // Outside top bound
    expect(collisionSystem.isPositionValid(960, -10)).toBe(false);

    // Outside bottom bound
    expect(collisionSystem.isPositionValid(960, 1090)).toBe(false);
  });

  it("rejects positions inside walls", () => {
    // Top wall at y=0 to y=20
    expect(collisionSystem.isPositionValid(960, 10)).toBe(false);

    // Left wall at x=0 to x=20
    expect(collisionSystem.isPositionValid(10, 540)).toBe(false);

    // Right wall at x=1900 to x=1920
    expect(collisionSystem.isPositionValid(1910, 540)).toBe(false);

    // Bottom wall at y=1060 to y=1080
    expect(collisionSystem.isPositionValid(960, 1070)).toBe(false);
  });

  it("allows positions in door openings", () => {
    // Bridge-corridor door at x=900-1020, y=250-270
    // This should be an opening in the wall
    expect(collisionSystem.isPositionValid(960, 260)).toBe(true);
  });

  it("validates movement that doesn't cross walls", () => {
    // Movement in open space
    expect(collisionSystem.isMovementValid(960, 540, 1000, 540)).toBe(true);
    expect(collisionSystem.isMovementValid(960, 540, 960, 580)).toBe(true);
  });

  it("rejects movement that crosses walls", () => {
    // Try to move from center through top wall
    expect(collisionSystem.isMovementValid(960, 540, 960, -10)).toBe(false);

    // Try to move from center through left wall
    expect(collisionSystem.isMovementValid(960, 540, -10, 540)).toBe(false);
  });

  it("allows movement through door openings", () => {
    // Move from corridor-north (y=340) through bridge-corridor door (y=250-270) to bridge (y=150)
    // The door is at y=250-270, so moving from y=340 to y=150 should pass through the door
    expect(collisionSystem.isMovementValid(960, 340, 960, 150)).toBe(true);
  });

  it("clamps invalid positions to nearest valid position", () => {
    // Position inside top wall
    const clamped = collisionSystem.clampToValidPosition(960, 10);
    expect(clamped.y).toBeGreaterThanOrEqual(GAME_CONFIG.PLAYER_RADIUS);
    expect(collisionSystem.isPositionValid(clamped.x, clamped.y)).toBe(true);
  });

  it("returns valid spawn points", () => {
    const spawn = collisionSystem.getValidSpawnPoint();
    expect(collisionSystem.isPositionValid(spawn.x, spawn.y)).toBe(true);
    expect(spawn.x).toBeGreaterThanOrEqual(GAME_CONFIG.PLAYER_RADIUS);
    expect(spawn.x).toBeLessThanOrEqual(GAME_CONFIG.MAP_WIDTH - GAME_CONFIG.PLAYER_RADIUS);
    expect(spawn.y).toBeGreaterThanOrEqual(GAME_CONFIG.PLAYER_RADIUS);
    expect(spawn.y).toBeLessThanOrEqual(GAME_CONFIG.MAP_HEIGHT - GAME_CONFIG.PLAYER_RADIUS);
  });

  it("returns spawn points from predefined list", () => {
    const spawn = collisionSystem.getValidSpawnPoint();
    const isKnownSpawn = STARFALL_MAP.spawnPoints.some(
      (s) => s.x === spawn.x && s.y === spawn.y
    );
    // Should be one of the predefined spawn points or the fallback center
    expect(isKnownSpawn || (spawn.x === GAME_CONFIG.MAP_WIDTH / 2 && spawn.y === GAME_CONFIG.MAP_HEIGHT / 2)).toBe(true);
  });

  it("avoids spawn points occupied by other players", () => {
    // Add a player at the first spawn point (bridge)
    const player = new Player();
    player.sessionId = "client-1";
    player.state = PlayerState.Alive;
    const firstSpawnPoint = STARFALL_MAP.spawnPoints[0];
    expect(firstSpawnPoint).toBeDefined();
    if (!firstSpawnPoint) return;
    
    player.x = firstSpawnPoint.x;
    player.y = firstSpawnPoint.y;
    state.players.set("client-1", player);

    // Verify player is in state
    expect(state.players.size).toBe(1);
    const statePlayer = state.players.get("client-1");
    expect(statePlayer).toBeDefined();
    if (statePlayer) {
      expect(statePlayer.x).toBe(firstSpawnPoint.x);
      expect(statePlayer.y).toBe(firstSpawnPoint.y);
    }

    // Get a spawn point - should not be the same as the occupied one
    const spawn = collisionSystem.getValidSpawnPoint();
    
    // Should be a valid spawn point
    expect(collisionSystem.isPositionValid(spawn.x, spawn.y)).toBe(true);
    
    // Should be one of the predefined spawn points OR the center fallback
    const isKnownSpawn = STARFALL_MAP.spawnPoints.some(
      (s) => s.x === spawn.x && s.y === spawn.y
    );
    const isCenterFallback = spawn.x === GAME_CONFIG.MAP_WIDTH / 2 && spawn.y === GAME_CONFIG.MAP_HEIGHT / 2;
    expect(isKnownSpawn || isCenterFallback).toBe(true);
    
    // Should not be the exact same spawn point (both x and y)
    const isOccupiedSpawn = spawn.x === firstSpawnPoint.x && spawn.y === firstSpawnPoint.y;
    expect(isOccupiedSpawn).toBe(false);
  });

  it("provides access to walls and doors for rendering", () => {
    const walls = collisionSystem.getWalls();
    const doors = collisionSystem.getDoors();

    expect(walls.length).toBeGreaterThan(0);
    expect(doors.length).toBeGreaterThan(0);
    expect(walls).toEqual(STARFALL_MAP.walls);
    expect(doors).toEqual(STARFALL_MAP.doors);
  });

  it("provides access to map definition", () => {
    const map = collisionSystem.getMapDefinition();
    expect(map).toBe(STARFALL_MAP);
  });
});

describe("Map Geometry Utilities", () => {
  it("checks point in rectangle", () => {
    const { pointInRect } = require("@starfall/shared");
    const rect = { x: 0, y: 0, width: 100, height: 100 };

    expect(pointInRect({ x: 50, y: 50 }, rect)).toBe(true);
    expect(pointInRect({ x: 0, y: 0 }, rect)).toBe(true);
    expect(pointInRect({ x: 100, y: 100 }, rect)).toBe(true);
    expect(pointInRect({ x: -1, y: 50 }, rect)).toBe(false);
    expect(pointInRect({ x: 50, y: 101 }, rect)).toBe(false);
  });

  it("checks circle-rectangle intersection", () => {
    const { circleRectIntersect } = require("@starfall/shared");
    const rect = { x: 0, y: 0, width: 100, height: 100 };

    // Circle inside rect
    expect(circleRectIntersect(50, 50, 10, rect)).toBe(true);

    // Circle touching rect edge
    expect(circleRectIntersect(100, 50, 10, rect)).toBe(true);

    // Circle outside rect
    expect(circleRectIntersect(120, 50, 10, rect)).toBe(false);

    // Circle at corner
    expect(circleRectIntersect(110, 110, 10, rect)).toBe(false);
    expect(circleRectIntersect(105, 105, 10, rect)).toBe(true);
  });

  it("checks line-rectangle intersection", () => {
    const { lineRectIntersect } = require("@starfall/shared");
    const rect = { x: 0, y: 0, width: 100, height: 100 };

    // Line crossing rect
    expect(lineRectIntersect(-10, 50, 110, 50, rect)).toBe(true);

    // Line along edge
    expect(lineRectIntersect(-10, 0, 110, 0, rect)).toBe(true);

    // Line outside rect
    expect(lineRectIntersect(-10, -10, -5, -5, rect)).toBe(false);

    // Line starting inside rect
    expect(lineRectIntersect(50, 50, 150, 50, rect)).toBe(true);
  });
});