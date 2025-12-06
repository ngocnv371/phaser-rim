
import { ItemType, StructureBlueprint } from "./types";

export const TILE_SIZE = 32;
export const MAP_WIDTH = 64;
export const MAP_HEIGHT = 64;

export const COLORS = {
    GRASS: 0x2e7d32,
    DIRT: 0x5d4037,
    ROCK_FLOOR: 0x424242,
    WATER: 0x1976d2,
    PAWN: 0xffeb3b,
    SELECTION: 0x2196f3,
};

export const RESOURCE_ICONS = {
    TREE: '🌲',
    BERRY_BUSH: '🫐',
    ROCK_CHUNK: '🪨',
    IRON_ORE: '🏔️',
    GOLD_ORE: '🧈',
};

export const ITEM_ICONS = {
    [ItemType.WOOD]: '🪵',
    [ItemType.FOOD]: '🍱',
    [ItemType.STONE]: '🪨',
    [ItemType.IRON]: '🔩',
    [ItemType.GOLD]: '💰'
};

export const NEEDS_DECAY_RATE = {
    Food: 0.05,
    Sleep: 0.02,
    Recreation: 0.04,
};

export const BLUEPRINTS: Record<string, StructureBlueprint> = {
    WALL: { id: 'wall', type: 'wall', name: 'Wall', workToBuild: 100, color: 0x9e9e9e, icon: '🧱', isPassable: false, cost: [{type: ItemType.STONE, amount: 5}] },
    FLOOR: { id: 'floor', type: 'floor', name: 'Floor', workToBuild: 20, color: 0x795548, icon: '🟫', isPassable: true, cost: [{type: ItemType.WOOD, amount: 2}] },
    CONTAINER: { id: 'container', type: 'container', name: 'Container', workToBuild: 150, color: 0x8d6e63, icon: '📦', isPassable: false, cost: [{type: ItemType.WOOD, amount: 10}] },
    BED: { id: 'bed', type: 'bed', name: 'Bed', workToBuild: 200, color: 0x3f51b5, icon: '🛏️', isPassable: true, cost: [{type: ItemType.WOOD, amount: 10}] },
    CAMPFIRE: { id: 'campfire', type: 'campfire', name: 'Campfire', workToBuild: 100, color: 0xe64a19, icon: '🔥', isPassable: false, cost: [{type: ItemType.WOOD, amount: 10}] },
};

export const ACTIONS = {
    SELECT: 'select',
    HARVEST: 'harvest',
    CHOP: 'chop',
    MINE: 'mine',
    CANCEL: 'cancel'
} as const;
