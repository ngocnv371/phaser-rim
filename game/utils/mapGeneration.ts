import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../../constants';
import { TileType, ResourceType } from '../../types';

export interface GeneratedMap {
    tiles: TileType[][];
    resources: Map<string, ResourceType>;
}

export const createInitialMap = (): GeneratedMap => {
    const tiles: TileType[][] = [];
    const resources = new Map<string, ResourceType>();

    // 1. Initialize grid with Grass
    for (let y = 0; y < MAP_HEIGHT; y++) {
        tiles[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            tiles[y][x] = TileType.GRASS;
        }
    }

    // 2. Helper for blobs
    const drawBlob = (count: number, minSize: number, maxSize: number, tileType: TileType, resourceType?: ResourceType) => {
        for (let i = 0; i < count; i++) {
            const cx = Phaser.Math.Between(5, MAP_WIDTH - 5);
            const cy = Phaser.Math.Between(5, MAP_HEIGHT - 5);
            const r = Phaser.Math.Between(minSize, maxSize);

            for (let y = cy - r; y <= cy + r; y++) {
                for (let x = cx - r; x <= cx + r; x++) {
                    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                        // Circular shape check
                        if (Phaser.Math.Distance.Between(cx, cy, x, y) < r) {
                            tiles[y][x] = tileType;
                            
                            const key = `${x},${y}`;
                            // Remove existing resources if terrain changes
                            if (resources.has(key)) resources.delete(key);

                            // Chance to spawn specific resource for this terrain blob
                            if (resourceType && Math.random() < 0.7) {
                                resources.set(key, resourceType);
                            }
                        }
                    }
                }
            }
        }
    };

    // 3. Generate Features
    // Water & Hazards
    drawBlob(8, 2, 5, TileType.DEEP_WATER);
    drawBlob(15, 2, 4, TileType.SHALLOW_WATER);
    drawBlob(10, 2, 4, TileType.MARSH);
    drawBlob(2, 2, 3, TileType.LAVA);

    // Mountains & Ores
    drawBlob(6, 3, 6, TileType.ROCK, ResourceType.ROCK_CHUNK);
    drawBlob(3, 2, 3, TileType.ROCK, ResourceType.IRON_ORE);
    drawBlob(1, 2, 2, TileType.ROCK, ResourceType.GOLD_ORE);

    // 4. Scatter Vegetation (Grass, Trees, Bushes) on valid soil
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const key = `${x},${y}`;
            if (resources.has(key)) continue;

            const type = tiles[y][x];
            // Vegetation grows on Grass, Dirt, and Marsh
            const isSoil = type === TileType.GRASS || type === TileType.DIRT || type === TileType.MARSH;

            if (isSoil) {
                const rand = Math.random();
                if (rand < 0.05) resources.set(key, ResourceType.TREE);
                else if (rand < 0.07) resources.set(key, ResourceType.BERRY_BUSH);
                else if (rand < 0.25) resources.set(key, ResourceType.GRASS); // High rate for grass
            }
        }
    }

    return { tiles, resources };
};
