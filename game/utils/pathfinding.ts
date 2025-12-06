import { Position } from '../../types';
import { MAP_WIDTH, MAP_HEIGHT } from '../../constants';

// A simplified pathfinder. 
// in a real game, use A* and cache navigation meshes.
export const findPath = (
    start: Position,
    end: Position,
    isWalkable: (x: number, y: number) => boolean
): Position[] => {
    
    // Direct optimization: if close and straight line is clear
    // For this demo, we'll use a basic BFS to ensure walls are respected.
    
    const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [] }];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);

    // Limit search depth for performance in JS loop
    let iterations = 0;
    const MAX_ITERATIONS = 2000; 

    while (queue.length > 0) {
        iterations++;
        if (iterations > MAX_ITERATIONS) return []; // Path too long or complex

        const { pos, path } = queue.shift()!;

        if (pos.x === end.x && pos.y === end.y) {
            return path;
        }

        const neighbors = [
            { x: pos.x + 1, y: pos.y },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x, y: pos.y - 1 },
        ];

        for (const n of neighbors) {
            if (
                n.x >= 0 && n.x < MAP_WIDTH &&
                n.y >= 0 && n.y < MAP_HEIGHT
            ) {
                const key = `${n.x},${n.y}`;
                if (!visited.has(key)) {
                    // Check walkability unless it is the EXACT target (e.g. mining a rock, you stand next to it, but here we assume we walk ONTO it for simplicity or check neighbor)
                    // For mining/building, usually we path to adjacent. 
                    // To keep it simple: We allow pathing INTO the target tile if it's the target.
                    const isTarget = n.x === end.x && n.y === end.y;
                    
                    if (isWalkable(n.x, n.y) || isTarget) {
                        visited.add(key);
                        queue.push({ pos: n, path: [...path, n] });
                    }
                }
            }
        }
    }

    return [];
};

export const getAdjacentFreeTile = (
    target: Position, 
    isWalkable: (x: number, y: number) => boolean
): Position | null => {
    const neighbors = [
        { x: target.x + 1, y: target.y },
        { x: target.x - 1, y: target.y },
        { x: target.x, y: target.y + 1 },
        { x: target.x, y: target.y - 1 },
    ];
    
    for (const n of neighbors) {
        if (n.x >= 0 && n.x < MAP_WIDTH && n.y >= 0 && n.y < MAP_HEIGHT) {
            if (isWalkable(n.x, n.y)) return n;
        }
    }
    return null;
}