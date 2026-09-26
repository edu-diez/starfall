// Shared map data and collision geometry
// This is an original spaceship map design - not based on any existing game
/**
 * Check if a point is inside a rectangle
 */
export function pointInRect(point, rect) {
    return (point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height);
}
/**
 * Check if a circle intersects with a rectangle
 */
export function circleRectIntersect(circleX, circleY, radius, rect) {
    // Find the closest point on the rectangle to the circle center
    const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.height));
    // Calculate distance from circle center to closest point
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    return dx * dx + dy * dy <= radius * radius;
}
/**
 * Check if a line segment intersects with a rectangle
 */
export function lineRectIntersect(x1, y1, x2, y2, rect) {
    // Check if either endpoint is inside the rectangle
    if (pointInRect({ x: x1, y: y1 }, rect) || pointInRect({ x: x2, y: y2 }, rect)) {
        return true;
    }
    // Check intersection with each edge of the rectangle
    const edges = [
        { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y }, // Top
        { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height }, // Right
        { x1: rect.x + rect.width, y1: rect.y + rect.height, x2: rect.x, y2: rect.y + rect.height }, // Bottom
        { x1: rect.x, y1: rect.y + rect.height, x2: rect.x, y2: rect.y }, // Left
    ];
    for (const edge of edges) {
        if (lineLineIntersect(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2)) {
            return true;
        }
    }
    return false;
}
/**
 * Check if two line segments intersect
 */
function lineLineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0)
        return false; // Parallel lines
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
/**
 * Original spaceship map - "USC Starfall"
 * A medium-sized research vessel with distinct sections
 */
export const STARFALL_MAP = {
    width: 1920,
    height: 1080,
    rooms: [
        {
            id: "bridge",
            name: "Bridge",
            bounds: { x: 600, y: 50, width: 720, height: 200 },
            doors: ["bridge-corridor"],
            spawnPoints: [{ x: 960, y: 150 }],
        },
        {
            id: "corridor-north",
            name: "North Corridor",
            bounds: { x: 800, y: 250, width: 320, height: 180 },
            doors: ["bridge-corridor", "corridor-medbay", "corridor-security", "corridor-central"],
            spawnPoints: [{ x: 960, y: 340 }],
        },
        {
            id: "medbay",
            name: "Medbay",
            bounds: { x: 50, y: 250, width: 300, height: 250 },
            doors: ["corridor-medbay"],
            spawnPoints: [{ x: 200, y: 375 }],
        },
        {
            id: "security",
            name: "Security",
            bounds: { x: 1570, y: 250, width: 300, height: 250 },
            doors: ["corridor-security"],
            spawnPoints: [{ x: 1720, y: 375 }],
        },
        {
            id: "central-corridor",
            name: "Central Corridor",
            bounds: { x: 800, y: 430, width: 320, height: 220 },
            doors: ["corridor-central", "central-cafeteria", "central-engineering", "central-storage"],
            spawnPoints: [{ x: 960, y: 540 }],
        },
        {
            id: "cafeteria",
            name: "Cafeteria",
            bounds: { x: 50, y: 550, width: 400, height: 300 },
            doors: ["central-cafeteria"],
            spawnPoints: [{ x: 250, y: 700 }],
        },
        {
            id: "engineering",
            name: "Engineering",
            bounds: { x: 1470, y: 550, width: 400, height: 300 },
            doors: ["central-engineering"],
            spawnPoints: [{ x: 1670, y: 700 }],
        },
        {
            id: "storage",
            name: "Storage",
            bounds: { x: 800, y: 700, width: 320, height: 200 },
            doors: ["central-storage", "storage-vent-access"],
            spawnPoints: [{ x: 960, y: 800 }],
        },
        {
            id: "meeting-room",
            name: "Meeting Room",
            bounds: { x: 800, y: 900, width: 320, height: 150 },
            doors: [],
            spawnPoints: [
                { x: 880, y: 950 },
                { x: 1040, y: 950 },
                { x: 960, y: 980 },
            ],
        },
    ],
    doors: [
        {
            id: "bridge-corridor",
            x: 900,
            y: 250,
            width: 120,
            height: 20,
            connects: ["bridge", "corridor-north"],
            isOpen: true,
        },
        {
            id: "corridor-medbay",
            x: 800,
            y: 320,
            width: 20,
            height: 100,
            connects: ["corridor-north", "medbay"],
            isOpen: true,
        },
        {
            id: "corridor-security",
            x: 1100,
            y: 320,
            width: 20,
            height: 100,
            connects: ["corridor-north", "security"],
            isOpen: true,
        },
        {
            id: "corridor-central",
            x: 900,
            y: 430,
            width: 120,
            height: 20,
            connects: ["corridor-north", "central-corridor"],
            isOpen: true,
        },
        {
            id: "central-cafeteria",
            x: 800,
            y: 580,
            width: 20,
            height: 100,
            connects: ["central-corridor", "cafeteria"],
            isOpen: true,
        },
        {
            id: "central-engineering",
            x: 1100,
            y: 580,
            width: 20,
            height: 100,
            connects: ["central-corridor", "engineering"],
            isOpen: true,
        },
        {
            id: "central-storage",
            x: 900,
            y: 650,
            width: 120,
            height: 20,
            connects: ["central-corridor", "storage"],
            isOpen: true,
        },
        {
            id: "storage-vent-access",
            x: 1050,
            y: 850,
            width: 20,
            height: 50,
            connects: ["storage", "meeting-room"],
            isOpen: true,
        },
    ],
    walls: [
        // Outer hull walls
        { x: 0, y: 0, width: 1920, height: 20 }, // Top
        { x: 0, y: 1060, width: 1920, height: 20 }, // Bottom
        { x: 0, y: 0, width: 20, height: 1080 }, // Left
        { x: 1900, y: 0, width: 20, height: 1080 }, // Right
        // Bridge walls (with door opening)
        { x: 600, y: 50, width: 300, height: 20 }, // Top left
        { x: 1020, y: 50, width: 300, height: 20 }, // Top right
        { x: 600, y: 50, width: 20, height: 200 }, // Left
        { x: 1300, y: 50, width: 20, height: 200 }, // Right
        { x: 600, y: 250, width: 300, height: 20 }, // Bottom left
        { x: 1020, y: 250, width: 300, height: 20 }, // Bottom right
        // North Corridor walls
        { x: 800, y: 250, width: 100, height: 20 }, // Top left
        { x: 1020, y: 250, width: 100, height: 20 }, // Top right
        { x: 800, y: 250, width: 20, height: 70 }, // Left top
        { x: 800, y: 370, width: 20, height: 60 }, // Left bottom
        { x: 1100, y: 250, width: 20, height: 70 }, // Right top
        { x: 1100, y: 370, width: 20, height: 60 }, // Right bottom
        { x: 800, y: 430, width: 100, height: 20 }, // Bottom left
        { x: 1020, y: 430, width: 100, height: 20 }, // Bottom right
        // Medbay walls
        { x: 50, y: 250, width: 300, height: 20 }, // Top
        { x: 50, y: 250, width: 20, height: 250 }, // Left
        { x: 330, y: 250, width: 20, height: 70 }, // Right top
        { x: 330, y: 370, width: 20, height: 130 }, // Right bottom
        { x: 50, y: 500, width: 300, height: 20 }, // Bottom
        // Security walls
        { x: 1570, y: 250, width: 300, height: 20 }, // Top
        { x: 1570, y: 250, width: 20, height: 70 }, // Left top
        { x: 1570, y: 370, width: 20, height: 130 }, // Left bottom
        { x: 1850, y: 250, width: 20, height: 250 }, // Right
        { x: 1570, y: 500, width: 300, height: 20 }, // Bottom
        // Central Corridor walls
        { x: 800, y: 430, width: 100, height: 20 }, // Top left
        { x: 1020, y: 430, width: 100, height: 20 }, // Top right
        { x: 800, y: 430, width: 20, height: 150 }, // Left top
        { x: 800, y: 630, width: 20, height: 20 }, // Left bottom
        { x: 1100, y: 430, width: 20, height: 150 }, // Right top
        { x: 1100, y: 630, width: 20, height: 20 }, // Right bottom
        { x: 800, y: 650, width: 100, height: 20 }, // Bottom left
        { x: 1020, y: 650, width: 100, height: 20 }, // Bottom right
        // Cafeteria walls
        { x: 50, y: 550, width: 400, height: 20 }, // Top
        { x: 50, y: 550, width: 20, height: 300 }, // Left
        { x: 430, y: 550, width: 20, height: 30 }, // Right top
        { x: 430, y: 630, width: 20, height: 220 }, // Right bottom
        { x: 50, y: 850, width: 400, height: 20 }, // Bottom
        // Engineering walls
        { x: 1470, y: 550, width: 400, height: 20 }, // Top
        { x: 1470, y: 550, width: 20, height: 30 }, // Left top
        { x: 1470, y: 630, width: 20, height: 220 }, // Left bottom
        { x: 1850, y: 550, width: 20, height: 300 }, // Right
        { x: 1470, y: 850, width: 400, height: 20 }, // Bottom
        // Storage walls
        { x: 800, y: 700, width: 250, height: 20 }, // Top left
        { x: 1070, y: 700, width: 50, height: 20 }, // Top right
        { x: 800, y: 700, width: 20, height: 150 }, // Left
        { x: 1100, y: 700, width: 20, height: 150 }, // Right
        { x: 800, y: 850, width: 250, height: 20 }, // Bottom left
        { x: 1070, y: 850, width: 50, height: 20 }, // Bottom right
        // Meeting room walls
        { x: 800, y: 900, width: 320, height: 20 }, // Top
        { x: 800, y: 900, width: 20, height: 150 }, // Left
        { x: 1100, y: 900, width: 20, height: 150 }, // Right
        { x: 800, y: 1050, width: 320, height: 20 }, // Bottom
    ],
    spawnPoints: [
        { x: 960, y: 150 }, // Bridge
        { x: 960, y: 340 }, // North Corridor
        { x: 200, y: 375 }, // Medbay
        { x: 1720, y: 375 }, // Security
        { x: 960, y: 540 }, // Central Corridor
        { x: 250, y: 700 }, // Cafeteria
        { x: 1670, y: 700 }, // Engineering
        { x: 960, y: 800 }, // Storage
    ],
    meetingRoomId: "meeting-room",
    ventNodes: [
        { id: "vent-bridge", x: 960, y: 150, radius: 30, roomId: "bridge" },
        { id: "vent-medbay", x: 200, y: 375, radius: 30, roomId: "medbay" },
        { id: "vent-security", x: 1720, y: 375, radius: 30, roomId: "security" },
        { id: "vent-cafeteria", x: 250, y: 700, radius: 30, roomId: "cafeteria" },
        { id: "vent-engineering", x: 1670, y: 700, radius: 30, roomId: "engineering" },
        { id: "vent-storage", x: 960, y: 800, radius: 30, roomId: "storage" },
    ],
    ventConnections: [
        { from: "vent-bridge", to: "vent-medbay" },
        { from: "vent-bridge", to: "vent-security" },
        { from: "vent-medbay", to: "vent-cafeteria" },
        { from: "vent-security", to: "vent-engineering" },
        { from: "vent-cafeteria", to: "vent-storage" },
        { from: "vent-engineering", to: "vent-storage" },
    ],
};
/**
 * Get a map definition by name
 */
export function getMapDefinition(name) {
    switch (name) {
        case "starfall":
        default:
            return STARFALL_MAP;
    }
}
/**
 * Get all collision walls for the map
 */
export function getMapWalls(map = STARFALL_MAP) {
    return map.walls;
}
/**
 * Get all doors for the map
 */
export function getMapDoors(map = STARFALL_MAP) {
    return map.doors;
}
/**
 * Get spawn points for the map
 */
export function getSpawnPoints(map = STARFALL_MAP) {
    return map.spawnPoints;
}
/**
 * Get vent nodes for the map
 */
export function getVentNodes(map = STARFALL_MAP) {
    return map.ventNodes;
}
/**
 * Get vent connections for the map
 */
export function getVentConnections(map = STARFALL_MAP) {
    return map.ventConnections;
}
/**
 * Find a vent node by ID
 */
export function findVentNode(nodeId, map = STARFALL_MAP) {
    return map.ventNodes.find((node) => node.id === nodeId);
}
/**
 * Get connected vent nodes for a given node
 */
export function getConnectedVentNodes(nodeId, map = STARFALL_MAP) {
    const connections = map.ventConnections.filter((conn) => conn.from === nodeId || conn.to === nodeId);
    const connectedIds = connections.map((conn) => conn.from === nodeId ? conn.to : conn.from);
    return map.ventNodes.filter((node) => connectedIds.includes(node.id));
}
