

export enum SkillType {
    CONSTRUCTION = 'Construction',
    MINING = 'Mining',
    PLANTS = 'Plants',
}

export interface Skill {
    level: number;
    exp: number;
}

export enum NeedType {
    FOOD = 'Food',
    SLEEP = 'Sleep',
    RECREATION = 'Recreation',
}

export enum TaskType {
    BUILD = 'Build',
    MINE = 'Mine',
    HARVEST = 'Harvest', // Berries
    CHOP = 'Chop', // Trees
    HAUL = 'Haul', // Carry to container
    SLEEP = 'Sleep',
    EAT = 'Eat',
    RECREATION = 'Recreation',
    WANDER = 'Wander'
}

export interface Position {
    x: number;
    y: number;
}

export interface Task {
    id: string;
    type: TaskType;
    targetPos: Position;
    workAmount: number; // Ticks required to complete
    assignedPawnId?: string | null;
    structureId?: string; // If building something
}

export enum ItemType {
    WOOD = 'Wood',
    FOOD = 'Food',
    STONE = 'Stone',
    IRON = 'Iron',
    GOLD = 'Gold'
}

export interface Item {
    type: ItemType;
    amount: number;
}

export interface StructureBlueprint {
    id: string;
    type: string;
    name: string;
    workToBuild: number;
    color: number;
    icon: string;
    isPassable: boolean;
    cost: Item[];
    isPlant?: boolean; // If true, creates a resource instead of structure
}

export interface PresetItem {
    x: number;
    y: number;
    blueprintId: string;
}

export interface Preset {
    id: string;
    name: string;
    description: string;
    items: PresetItem[];
}

export interface PawnData {
    id: string;
    name: string;
    color: number;
    pos: Position;
    skills: Record<SkillType, Skill>;
    needs: Record<NeedType, number>;
    inventory: Item[];
    currentTaskId: string | null;
    state: 'idle' | 'moving' | 'working' | 'sleeping';
}

export enum ResourceType {
    TREE = 'Tree',
    BERRY_BUSH = 'Berry Bush',
    ROCK_CHUNK = 'Rock Chunk',
    IRON_ORE = 'Iron Ore',
    GOLD_ORE = 'Gold Ore',
    GRASS = 'Grass',
    POTATO_PLANT = 'Potato Plant'
}

export interface ResourceEntity {
    type: ResourceType;
    amount: number; // Base yield
    growth: number; // 0 to 100
}

export interface StructureEntity {
    id: string;
    type: string;
    x: number;
    y: number;
    health: number;
    inventory: Item[]; // For containers
}

export enum TileType {
    GRASS = 0,
    DIRT = 1,
    ROCK = 2,
    SHALLOW_WATER = 3,
    DEEP_WATER = 4,
    MARSH = 5,
    LAVA = 6
}

// Events for React-Phaser communication
export const EVENTS = {
    UPDATE_UI: 'update-ui',
    SET_INTERACTION_MODE: 'set-interaction-mode', // Build or Action or Preset
    UPDATE_HOVER: 'update-hover',
    FOCUS_PAWN: 'focus-pawn',
};