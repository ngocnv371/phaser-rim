

import { ItemType, StructureBlueprint, Preset } from "./types";

export const TILE_SIZE = 32;
export const MAP_WIDTH = 64;
export const MAP_HEIGHT = 64;
export const MAX_SKILL_LEVEL = 20;

export const COLORS = {
    GRASS: 0x2e7d32,
    DIRT: 0x5d4037,
    ROCK_FLOOR: 0x424242,
    WATER: 0x1976d2,
    SHALLOW_WATER: 0x4fc3f7,
    DEEP_WATER: 0x01579b,
    MARSH: 0x33691e,
    LAVA: 0xd32f2f,
    PAWN: 0xffeb3b,
    SELECTION: 0x2196f3,
};

export const RESOURCE_ICONS = {
    TREE: '🌲',
    BERRY_BUSH: '🫐',
    ROCK_CHUNK: '🪨',
    IRON_ORE: '🏔️',
    GOLD_ORE: '🧈',
    GRASS: '🌿',
    POTATO_PLANT: '🥔',
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
    DOOR: { id: 'door', type: 'door', name: 'Door', workToBuild: 50, color: 0x795548, icon: '🚪', isPassable: true, cost: [{type: ItemType.WOOD, amount: 5}] },
    FLOOR: { id: 'floor', type: 'floor', name: 'Floor', workToBuild: 20, color: 0x795548, icon: '🟫', isPassable: true, cost: [{type: ItemType.WOOD, amount: 2}] },
    CONTAINER: { id: 'container', type: 'container', name: 'Container', workToBuild: 150, color: 0x8d6e63, icon: '📦', isPassable: false, cost: [{type: ItemType.WOOD, amount: 10}] },
    BED: { id: 'bed', type: 'bed', name: 'Bed', workToBuild: 200, color: 0x3f51b5, icon: '🛏️', isPassable: true, cost: [{type: ItemType.WOOD, amount: 10}] },
    CAMPFIRE: { id: 'campfire', type: 'campfire', name: 'Campfire', workToBuild: 100, color: 0xe64a19, icon: '🔥', isPassable: false, cost: [{type: ItemType.WOOD, amount: 10}] },
    TABLE: { id: 'table', type: 'table', name: 'Table', workToBuild: 100, color: 0x8d6e63, icon: '🛋️', isPassable: false, cost: [{type: ItemType.WOOD, amount: 10}] },
    CHAIR: { id: 'chair', type: 'chair', name: 'Chair', workToBuild: 50, color: 0x8d6e63, icon: '🪑', isPassable: true, cost: [{type: ItemType.WOOD, amount: 5}] },
    POTATO_PLANT: { id: 'potato_plant', type: 'potato_plant', name: 'Potato', workToBuild: 30, color: 0x558b2f, icon: '🌱', isPassable: true, cost: [], isPlant: true },
};

export const ACTIONS = {
    SELECT: 'select',
    HARVEST: 'harvest',
    CHOP: 'chop',
    MINE: 'mine',
    CANCEL: 'cancel'
} as const;

export const PRESETS: Preset[] = [
    {
        id: 'small_cottage',
        name: 'Small Cottage',
        description: '5x5 house with essential furniture.',
        items: [
            // Walls (Outer Shell 5x5)
            { x: 0, y: 0, blueprintId: 'wall' }, { x: 1, y: 0, blueprintId: 'wall' }, { x: 2, y: 0, blueprintId: 'wall' }, { x: 3, y: 0, blueprintId: 'wall' }, { x: 4, y: 0, blueprintId: 'wall' },
            { x: 0, y: 1, blueprintId: 'wall' }, { x: 4, y: 1, blueprintId: 'wall' },
            { x: 0, y: 2, blueprintId: 'wall' }, { x: 4, y: 2, blueprintId: 'wall' },
            { x: 0, y: 3, blueprintId: 'wall' }, { x: 4, y: 3, blueprintId: 'wall' },
            { x: 0, y: 4, blueprintId: 'wall' }, { x: 1, y: 4, blueprintId: 'wall' }, { x: 3, y: 4, blueprintId: 'wall' }, { x: 4, y: 4, blueprintId: 'wall' },
            // Door
            { x: 2, y: 4, blueprintId: 'door' },
            // Floor (Inside)
            { x: 1, y: 1, blueprintId: 'floor' }, { x: 2, y: 1, blueprintId: 'floor' }, { x: 3, y: 1, blueprintId: 'floor' },
            { x: 1, y: 2, blueprintId: 'floor' }, { x: 2, y: 2, blueprintId: 'floor' }, { x: 3, y: 2, blueprintId: 'floor' },
            { x: 1, y: 3, blueprintId: 'floor' }, { x: 2, y: 3, blueprintId: 'floor' }, { x: 3, y: 3, blueprintId: 'floor' },
            // Furniture
            { x: 1, y: 1, blueprintId: 'container' },
            { x: 1, y: 2, blueprintId: 'bed' },
            { x: 1, y: 3, blueprintId: 'bed' },
            { x: 3, y: 2, blueprintId: 'table' }, { x: 3, y: 3, blueprintId: 'table' }, // 2x1 Table simulation
            { x: 2, y: 2, blueprintId: 'chair' }, { x: 2, y: 3, blueprintId: 'chair' },
        ]
    },
    {
        id: 'potato_farm',
        name: 'Potato Farm',
        description: '3x3 plot of potato plants.',
        items: [
            { x: 0, y: 0, blueprintId: 'potato_plant' }, { x: 1, y: 0, blueprintId: 'potato_plant' }, { x: 2, y: 0, blueprintId: 'potato_plant' },
            { x: 0, y: 1, blueprintId: 'potato_plant' }, { x: 1, y: 1, blueprintId: 'potato_plant' }, { x: 2, y: 1, blueprintId: 'potato_plant' },
            { x: 0, y: 2, blueprintId: 'potato_plant' }, { x: 1, y: 2, blueprintId: 'potato_plant' }, { x: 2, y: 2, blueprintId: 'potato_plant' },
        ]
    }
];