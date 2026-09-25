import { Vec2 } from "./index";
/**
 * Represents a rectangular collision area (wall/obstacle)
 */
export interface CollisionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Represents a circular collision area
 */
export interface CollisionCircle {
    x: number;
    y: number;
    radius: number;
}
/**
 * Represents a door/passage between rooms
 */
export interface Door {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    connects: [string, string];
    isOpen: boolean;
}
/**
 * Represents a room in the spaceship
 */
export interface Room {
    id: string;
    name: string;
    bounds: CollisionRect;
    doors: string[];
    spawnPoints: Vec2[];
}
/**
 * Complete map definition
 */
export interface MapDefinition {
    width: number;
    height: number;
    rooms: Room[];
    doors: Door[];
    walls: CollisionRect[];
    spawnPoints: Vec2[];
    meetingRoomId: string;
    ventNodes: VentNode[];
    ventConnections: VentConnection[];
}
/**
 * Vent node for killer traversal
 */
export interface VentNode {
    id: string;
    x: number;
    y: number;
    radius: number;
    roomId: string;
}
/**
 * Connection between vent nodes
 */
export interface VentConnection {
    from: string;
    to: string;
}
/**
 * Check if a point is inside a rectangle
 */
export declare function pointInRect(point: Vec2, rect: CollisionRect): boolean;
/**
 * Check if a circle intersects with a rectangle
 */
export declare function circleRectIntersect(circleX: number, circleY: number, radius: number, rect: CollisionRect): boolean;
/**
 * Check if a line segment intersects with a rectangle
 */
export declare function lineRectIntersect(x1: number, y1: number, x2: number, y2: number, rect: CollisionRect): boolean;
/**
 * Original spaceship map - "USC Starfall"
 * A medium-sized research vessel with distinct sections
 */
export declare const STARFALL_MAP: MapDefinition;
/**
 * Get a map definition by name
 */
export declare function getMapDefinition(name: string): MapDefinition;
/**
 * Get all collision walls for the map
 */
export declare function getMapWalls(map?: MapDefinition): CollisionRect[];
/**
 * Get all doors for the map
 */
export declare function getMapDoors(map?: MapDefinition): Door[];
/**
 * Get spawn points for the map
 */
export declare function getSpawnPoints(map?: MapDefinition): Vec2[];
/**
 * Get vent nodes for the map
 */
export declare function getVentNodes(map?: MapDefinition): VentNode[];
/**
 * Get vent connections for the map
 */
export declare function getVentConnections(map?: MapDefinition): VentConnection[];
/**
 * Find a vent node by ID
 */
export declare function findVentNode(nodeId: string, map?: MapDefinition): VentNode | undefined;
/**
 * Get connected vent nodes for a given node
 */
export declare function getConnectedVentNodes(nodeId: string, map?: MapDefinition): VentNode[];
//# sourceMappingURL=map.d.ts.map