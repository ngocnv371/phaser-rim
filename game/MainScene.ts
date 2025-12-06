
import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS, BLUEPRINTS, RESOURCE_ICONS, ACTIONS, NEEDS_DECAY_RATE, MAX_SKILL_LEVEL, PRESETS } from '../constants';
import { PawnData, SkillType, NeedType, Task, TaskType, Position, EVENTS, ResourceType, ResourceEntity, StructureEntity, ItemType, Item, TileType } from '../types';
import { createInitialMap } from './utils/mapGeneration';

export default class MainScene extends Phaser.Scene {
    add!: Phaser.GameObjects.GameObjectFactory;
    cameras!: Phaser.Cameras.Scene2D.CameraManager;
    input!: Phaser.Input.InputPlugin;
    time!: Phaser.Time.Clock;
    game!: Phaser.Game;
    events!: Phaser.Events.EventEmitter;
    scale!: Phaser.Scale.ScaleManager;

    private mapLayer!: Phaser.GameObjects.Container;
    private objectLayer!: Phaser.GameObjects.Container;
    private overlayLayer!: Phaser.GameObjects.Container;
    
    // Game State
    private tiles: TileType[][] = []; 
    private resources: Map<string, ResourceEntity> = new Map();
    private structures: Map<string, StructureEntity> = new Map();
    private blueprints: Map<string, Task> = new Map();
    private pawns: PawnData[] = [];
    private globalTasks: Task[] = [];
    
    // Visuals
    private resourceText: Map<string, Phaser.GameObjects.Text> = new Map();
    private structureSprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private pawnSprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private blueprintGraphics: Map<string, Phaser.GameObjects.Rectangle> = new Map();
    private selectionGraphics!: Phaser.GameObjects.Graphics;
    private ghostBuilding!: Phaser.GameObjects.Container;
    
    // Interaction
    private interactionMode: { type: 'build' | 'action' | 'preset', value: string } = { type: 'action', value: ACTIONS.SELECT };
    private isDragging = false;
    private dragStart: Position | null = null;
    
    constructor() {
        super('MainScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1e1e1e');
        
        this.mapLayer = this.add.container(0, 0);
        this.objectLayer = this.add.container(0, 0);
        this.overlayLayer = this.add.container(0, 0);

        this.initMap();
        this.initPawns();
        this.setupInput();
        this.setupEvents();

        this.time.addEvent({ delay: 200, callback: () => this.emitUIUpdate(), loop: true });
        this.time.addEvent({ delay: 50, callback: () => this.checkMouseHover(), loop: true });
        // Plant Growth Timer (Every 1 second)
        this.time.addEvent({ delay: 1000, callback: () => this.growPlants(), loop: true });
        // Wild Plant Spawning (Every 3 seconds)
        this.time.addEvent({ delay: 3000, callback: () => this.trySpawnWildPlant(), loop: true });
    }

    update(time: number, delta: number) {
        this.handleCamera(delta);
        this.updateGhost();
        this.updatePawns(delta);
    }

    // --- Generation & Rendering ---

    private initMap() {
        // Generate Data
        const mapData = createInitialMap();
        this.tiles = mapData.tiles;

        // Render Tiles
        const graphics = this.add.graphics();
        this.mapLayer.add(graphics);

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const type = this.tiles[y][x];
                let color = COLORS.GRASS;
                
                if (type === TileType.DIRT) color = COLORS.DIRT;
                else if (type === TileType.ROCK) color = COLORS.ROCK_FLOOR;
                else if (type === TileType.SHALLOW_WATER) color = COLORS.SHALLOW_WATER;
                else if (type === TileType.DEEP_WATER) color = COLORS.DEEP_WATER;
                else if (type === TileType.MARSH) color = COLORS.MARSH;
                else if (type === TileType.LAVA) color = COLORS.LAVA;

                graphics.fillStyle(color, 1);
                graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
        
        // Grid lines
        graphics.lineStyle(1, 0x000000, 0.05);
        for(let x=0; x<=MAP_WIDTH; x++) graphics.lineBetween(x*TILE_SIZE, 0, x*TILE_SIZE, MAP_HEIGHT*TILE_SIZE);
        for(let y=0; y<=MAP_HEIGHT; y++) graphics.lineBetween(0, y*TILE_SIZE, MAP_WIDTH*TILE_SIZE, y*TILE_SIZE);

        // Spawn Initial Resources
        mapData.resources.forEach((type, key) => {
            const [xStr, yStr] = key.split(',');
            this.spawnSpecificResource(parseInt(xStr), parseInt(yStr), type);
        });
    }

    private spawnSpecificResource(x: number, y: number, type: ResourceType) {
        let icon = '';
        let amount = 0;
        let growth = 100; // Default fully grown for rocks etc.

        if (type === ResourceType.TREE) { icon = RESOURCE_ICONS.TREE; amount = 20; growth = Phaser.Math.Between(20, 100); }
        else if (type === ResourceType.BERRY_BUSH) { icon = RESOURCE_ICONS.BERRY_BUSH; amount = 10; growth = Phaser.Math.Between(20, 100); }
        else if (type === ResourceType.GRASS) { icon = RESOURCE_ICONS.GRASS; amount = 0; growth = Phaser.Math.Between(20, 100); }
        else if (type === ResourceType.POTATO_PLANT) { icon = RESOURCE_ICONS.POTATO_PLANT; amount = 10; growth = 0; }
        else if (type === ResourceType.ROCK_CHUNK) { icon = RESOURCE_ICONS.ROCK_CHUNK; amount = 20; }
        else if (type === ResourceType.IRON_ORE) { icon = RESOURCE_ICONS.IRON_ORE; amount = 40; }
        else if (type === ResourceType.GOLD_ORE) { icon = RESOURCE_ICONS.GOLD_ORE; amount = 40; }

        const res: ResourceEntity = { type, amount, growth };
        this.resources.set(`${x},${y}`, res);
        
        const text = this.add.text(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, icon, { fontSize: '20px' })
            .setOrigin(0.5);
        
        // Scale plants by growth visually
        if (type === ResourceType.TREE || type === ResourceType.BERRY_BUSH || type === ResourceType.GRASS || type === ResourceType.POTATO_PLANT) {
            text.setScale(0.5 + (growth/100) * 0.5);
            // Randomize angle for grass/plants slightly for variety
            if (type === ResourceType.GRASS) {
                text.setAngle(Phaser.Math.Between(-15, 15));
                text.setFontSize('16px'); 
            }
        }

        this.objectLayer.add(text);
        this.resourceText.set(`${x},${y}`, text);
    }

    private trySpawnWildPlant() {
        const x = Phaser.Math.Between(0, MAP_WIDTH - 1);
        const y = Phaser.Math.Between(0, MAP_HEIGHT - 1);
        const key = `${x},${y}`;

        // Check availability
        if (this.resources.has(key) || this.structures.has(key) || this.blueprints.has(key)) return;

        // Check soil
        const type = this.tiles[y][x];
        const isSoil = type === TileType.GRASS || type === TileType.DIRT || type === TileType.MARSH;
        
        if (isSoil) {
            const rand = Math.random();
            // Higher chance for grass, lower for bushes/trees
            if (rand < 0.6) this.spawnSpecificResource(x, y, ResourceType.GRASS);
            else if (rand < 0.8) this.spawnSpecificResource(x, y, ResourceType.BERRY_BUSH);
            else this.spawnSpecificResource(x, y, ResourceType.TREE);
        }
    }

    private initPawns() {
        const createPawn = (id: string, name: string, x: number, y: number) => {
            // Find a valid spot near spawn if x,y is invalid
            let spawnX = x, spawnY = y;
            while(!this.isLocationValid(spawnX, spawnY)) { spawnX++; }

            const pawn: PawnData = {
                id, name, color: COLORS.PAWN, pos: { x: spawnX, y: spawnY },
                skills: {
                    [SkillType.CONSTRUCTION]: { level: Phaser.Math.Between(1, 10), exp: 0 },
                    [SkillType.MINING]: { level: Phaser.Math.Between(1, 10), exp: 0 },
                    [SkillType.PLANTS]: { level: Phaser.Math.Between(1, 10), exp: 0 },
                },
                needs: { [NeedType.FOOD]: 80, [NeedType.SLEEP]: 80, [NeedType.RECREATION]: 80 },
                inventory: [],
                currentTaskId: null,
                state: 'idle'
            };
            this.pawns.push(pawn);

            const container = this.add.container(spawnX * TILE_SIZE + TILE_SIZE/2, spawnY * TILE_SIZE + TILE_SIZE/2);
            const circle = this.add.circle(0, 0, TILE_SIZE / 2.5, pawn.color);
            const text = this.add.text(0, -20, name, { fontSize: '10px', color: '#fff', backgroundColor: '#000' }).setOrigin(0.5);
            container.add([circle, text]);
            this.objectLayer.add(container);
            this.pawnSprites.set(id, container);
        };

        createPawn('p1', 'Alex', 10, 10);
        createPawn('p2', 'Sam', 12, 12);
    }

    // --- Inputs & Interaction ---

    private setupInput() {
        // Zoom
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
            const newZoom = this.cameras.main.zoom - deltaZ * 0.001;
            this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 3));
        });

        this.game.events.on(EVENTS.SET_INTERACTION_MODE, (mode: { type: 'build' | 'action' | 'preset', value: string }) => {
            this.interactionMode = mode;
            this.isDragging = false;
            this.ghostBuilding.setVisible(false);
            
            // Clean up ghost children
            this.ghostBuilding.removeAll(true);

            if (mode.type === 'build') {
                const bp = Object.values(BLUEPRINTS).find(b => b.type === mode.value);
                if (bp) {
                    const rect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, bp.color, 0.5);
                    const icon = this.add.text(0, 0, bp.icon, { fontSize: '20px' }).setOrigin(0.5);
                    this.ghostBuilding.add([rect, icon]);
                }
            }
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonDown()) {
                 this.isDragging = false;
                 return;
            }
            if (this.interactionMode.type === 'action') {
                this.isDragging = true;
                this.dragStart = this.getTilePos(pointer);
            } else if (this.interactionMode.type === 'build') {
                const { x, y } = this.getTilePos(pointer);
                this.createBlueprint(x, y, this.interactionMode.value);
            } else if (this.interactionMode.type === 'preset') {
                const { x, y } = this.getTilePos(pointer);
                this.createPreset(x, y, this.interactionMode.value);
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && this.dragStart) {
                const end = this.getTilePos(pointer);
                this.handleZoneSelection(this.dragStart, end);
            }
            this.isDragging = false;
            this.dragStart = null;
            this.selectionGraphics.clear();
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && this.dragStart) {
                const end = this.getTilePos(pointer);
                this.drawSelectionBox(this.dragStart, end);
            }
        });

        // Ghost building
        this.ghostBuilding = this.add.container(0, 0);
        this.ghostBuilding.setVisible(false);
        this.mapLayer.add(this.ghostBuilding);

        this.selectionGraphics = this.add.graphics();
        this.overlayLayer.add(this.selectionGraphics);
    }

    private getTilePos(pointer: Phaser.Input.Pointer): Position {
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        return {
            x: Math.floor(worldPoint.x / TILE_SIZE),
            y: Math.floor(worldPoint.y / TILE_SIZE)
        };
    }

    private handleZoneSelection(start: Position, end: Position) {
        const x1 = Math.min(start.x, end.x);
        const x2 = Math.max(start.x, end.x);
        const y1 = Math.min(start.y, end.y);
        const y2 = Math.max(start.y, end.y);

        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                this.applyActionToTile(x, y);
            }
        }
    }

    private applyActionToTile(x: number, y: number) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
        const key = `${x},${y}`;
        const mode = this.interactionMode.value;

        if (this.globalTasks.some(t => t.targetPos.x === x && t.targetPos.y === y && t.type !== TaskType.HAUL)) return;

        if (mode === ACTIONS.CANCEL) {
             const taskIndex = this.globalTasks.findIndex(t => t.targetPos.x === x && t.targetPos.y === y);
             if (taskIndex !== -1) {
                 const t = this.globalTasks[taskIndex];
                 if (t.assignedPawnId) {
                     const p = this.pawns.find(p => p.id === t.assignedPawnId);
                     if (p) { p.currentTaskId = null; p.state = 'idle'; }
                 }
                 this.globalTasks.splice(taskIndex, 1);
                 if (this.blueprintGraphics.has(t.id)) {
                     this.blueprintGraphics.get(t.id)!.destroy();
                     this.blueprintGraphics.delete(t.id);
                 }
                 if (this.blueprints.has(key)) this.blueprints.delete(key);
             }
             return;
        }

        const res = this.resources.get(key);

        if (mode === ACTIONS.CHOP && (res?.type === ResourceType.TREE || res?.type === ResourceType.GRASS)) {
            this.createTask(x, y, TaskType.CHOP, res.type === ResourceType.GRASS ? 30 : 100, 0xff0000);
        } else if (mode === ACTIONS.HARVEST && (res?.type === ResourceType.BERRY_BUSH || res?.type === ResourceType.POTATO_PLANT)) {
            this.createTask(x, y, TaskType.HARVEST, 50, 0x00ff00);
        } else if (mode === ACTIONS.MINE) {
            if (res && (res.type === ResourceType.ROCK_CHUNK || res.type === ResourceType.IRON_ORE || res.type === ResourceType.GOLD_ORE)) {
                this.createTask(x, y, TaskType.MINE, 120, 0x555555);
            }
        }
    }

    private createTask(x: number, y: number, type: TaskType, work: number, color: number, structId?: string) {
        const id = `task_${Date.now()}_${Math.random()}`;
        this.globalTasks.push({
            id, type, targetPos: { x, y }, workAmount: work, structureId: structId
        });
        
        const rect = this.add.rectangle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, color, 0.3);
        this.mapLayer.add(rect);
        this.blueprintGraphics.set(id, rect);

        if (type === TaskType.BUILD) {
             this.blueprints.set(`${x},${y}`, this.globalTasks[this.globalTasks.length-1]);
        }
    }

    private createBlueprint(x: number, y: number, type: string) {
        if (!this.isLocationValid(x, y, true)) return;
        
        const key = `${x},${y}`;

        // If building a floor on a floor, skip
        if (type === 'floor' && this.structures.has(key) && this.structures.get(key)!.type === 'floor') return;
        
        // Check for resources and auto-queue clearing
        if (this.resources.has(key)) {
            const res = this.resources.get(key)!;
            let taskType: TaskType | null = null;
            let work = 50;
            let color = 0xff0000;

            if (res.type === ResourceType.TREE) { 
                taskType = TaskType.CHOP; work = 100; color = 0xff0000; 
            } else if (res.type === ResourceType.ROCK_CHUNK || res.type === ResourceType.IRON_ORE || res.type === ResourceType.GOLD_ORE) { 
                taskType = TaskType.MINE; work = 120; color = 0x555555; 
            } else if (res.type === ResourceType.BERRY_BUSH || res.type === ResourceType.POTATO_PLANT) { 
                taskType = TaskType.HARVEST; work = 50; color = 0x00ff00; 
            } else if (res.type === ResourceType.GRASS) { 
                taskType = TaskType.CHOP; work = 20; color = 0x8bc34a; 
            }

            if (taskType) {
                // Avoid duplicate task
                const hasTask = this.globalTasks.some(t => t.targetPos.x === x && t.targetPos.y === y && t.type === taskType);
                if (!hasTask) {
                    this.createTask(x, y, taskType, work, color);
                }
            }
        }

        const bp = Object.values(BLUEPRINTS).find(b => b.type === type);
        if (bp) {
            this.createTask(x, y, TaskType.BUILD, bp.workToBuild, bp.color, type);
        }
    }

    private createPreset(x: number, y: number, presetId: string) {
        const preset = PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        // Simple validation: check if all spots are mostly valid
        
        preset.items.forEach(item => {
            const absX = x + item.x;
            const absY = y + item.y;
            // Check boundaries
            if (absX >= 0 && absX < MAP_WIDTH && absY >= 0 && absY < MAP_HEIGHT) {
                if (this.isLocationValid(absX, absY, true)) {
                     this.createBlueprint(absX, absY, item.blueprintId);
                }
            }
        });
    }

    // --- Logic Loop ---

    private growPlants() {
        this.resources.forEach((res, key) => {
            if (res.type === ResourceType.TREE || res.type === ResourceType.BERRY_BUSH || res.type === ResourceType.GRASS || res.type === ResourceType.POTATO_PLANT) {
                if (res.growth < 100) {
                    res.growth = Math.min(100, res.growth + 1); // +1% per second
                    // Update visual scale
                    const text = this.resourceText.get(key);
                    if (text) {
                        text.setScale(0.5 + (res.growth/100) * 0.5);
                    }
                }
            }
        });
    }

    private updatePawns(delta: number) {
        this.pawns.forEach(pawn => {
            // Decay Needs
            for (const n in pawn.needs) {
                pawn.needs[n as NeedType] -= (NEEDS_DECAY_RATE[n as keyof typeof NEEDS_DECAY_RATE] || 0.01) * (delta / 16);
                if (pawn.needs[n as NeedType] < 0) pawn.needs[n as NeedType] = 0;
            }

            if (pawn.state === 'idle') {
                this.think(pawn);
            } else if (pawn.state === 'moving') {
                this.movePawn(pawn, delta);
            } else if (pawn.state === 'working' || pawn.state === 'sleeping') {
                this.workTask(pawn, delta);
            }
        });
    }

    private think(pawn: PawnData) {
        // 1. Emergency Needs
        if (pawn.needs[NeedType.FOOD] < 30) {
            const foodContainer = this.findStructureWithItem(ItemType.FOOD);
            if (foodContainer) {
                this.assignSelfTask(pawn, TaskType.EAT, foodContainer, 50);
                return;
            }
        }
        
        if (pawn.needs[NeedType.SLEEP] < 30) {
             const bed = this.findNearestStructure(pawn.pos, 'bed');
             const target = bed ? { x: bed.x, y: bed.y } : pawn.pos;
             this.assignSelfTask(pawn, TaskType.SLEEP, { x: target.x, y: target.y }, 500); 
             return;
        }

        // 2. Hauling
        if (pawn.inventory.length > 0) {
            const container = this.findNearestStructure(pawn.pos, 'container');
            if (container) {
                this.assignSelfTask(pawn, TaskType.HAUL, { x: container.x, y: container.y }, 20);
                return;
            }
        }

        // 3. Global Tasks
        const validTasks = this.globalTasks.filter(t => !t.assignedPawnId && t.type !== TaskType.EAT && t.type !== TaskType.SLEEP && t.type !== TaskType.RECREATION);
        if (validTasks.length > 0) {
            // Find closest reachable
            // Simplified: first one
            const task = validTasks[0];
            task.assignedPawnId = pawn.id;
            pawn.currentTaskId = task.id;
            pawn.state = 'moving';
            return;
        }

        // 4. Recreation
        if (pawn.needs[NeedType.RECREATION] < 50) {
            this.assignSelfTask(pawn, TaskType.RECREATION, pawn.pos, 200);
            return;
        }
    }

    private assignSelfTask(pawn: PawnData, type: TaskType, pos: Position, work: number) {
        const id = `self_${pawn.id}_${Date.now()}`;
        const task: Task = { id, type, targetPos: pos, workAmount: work, assignedPawnId: pawn.id };
        this.globalTasks.push(task);
        pawn.currentTaskId = id;
        pawn.state = 'moving';
    }

    private workTask(pawn: PawnData, delta: number) {
        const task = this.globalTasks.find(t => t.id === pawn.currentTaskId);
        if (!task) { pawn.state = 'idle'; return; }

        task.workAmount -= 1 * (delta / 16);

        if (task.workAmount <= 0) {
            this.completeTask(task, pawn);
        }
    }

    private completeTask(task: Task, pawn: PawnData) {
        const key = `${task.targetPos.x},${task.targetPos.y}`;

        switch (task.type) {
            case TaskType.BUILD:
                if (task.structureId) {
                    const bp = Object.values(BLUEPRINTS).find(b => b.type === task.structureId);
                    if (bp) {
                        if (bp.isPlant) {
                            // If it's a plant blueprint, spawn a resource instead of structure
                            if (task.structureId === 'potato_plant') {
                                this.spawnSpecificResource(task.targetPos.x, task.targetPos.y, ResourceType.POTATO_PLANT);
                            }
                        } else {
                            // Standard Structure
                            const isBlock = task.structureId === 'wall' || task.structureId === 'floor';
                            let container: Phaser.GameObjects.Container;

                            if (isBlock) {
                                // For walls and floors, use a solid rectangle to look connected
                                const rect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, bp.color);
                                container = this.add.container(
                                    task.targetPos.x * TILE_SIZE + TILE_SIZE/2, 
                                    task.targetPos.y * TILE_SIZE + TILE_SIZE/2, 
                                    [rect]
                                );
                            } else {
                                // For furniture, keep the icon
                                const icon = this.add.text(0, 0, bp.icon, {fontSize: '20px'}).setOrigin(0.5);
                                container = this.add.container(
                                    task.targetPos.x * TILE_SIZE + TILE_SIZE/2, 
                                    task.targetPos.y * TILE_SIZE + TILE_SIZE/2, 
                                    [icon]
                                );
                            }
                            
                            this.structureSprites.set(key, container);
                            
                            this.structures.set(key, {
                                id: key, type: task.structureId, x: task.targetPos.x, y: task.targetPos.y, health: 100, inventory: []
                            });
                            
                            if(task.structureId === 'container') {
                                this.structures.get(key)!.inventory.push({ type: ItemType.FOOD, amount: 50 });
                            }

                            // Layer management
                            if (task.structureId === 'floor') {
                                this.mapLayer.add(container);
                            } else {
                                this.objectLayer.add(container);
                            }
                        }
                    }
                    this.blueprints.delete(key);
                }
                break;
            case TaskType.HARVEST:
            case TaskType.CHOP:
                const res = this.resources.get(key);
                if (res) {
                    if (res.type === ResourceType.GRASS) {
                        // Grass just disappears
                    } else if (res.growth < 80) {
                        // Yield nothing if immature
                    } else {
                        let itemType = (res.type === ResourceType.BERRY_BUSH || res.type === ResourceType.POTATO_PLANT) ? ItemType.FOOD : ItemType.WOOD;
                        const skill = pawn.skills[SkillType.PLANTS].level;
                        const skillFactor = 0.5 + ((skill - 1) / (MAX_SKILL_LEVEL - 1)) * 1.5; 
                        const amount = Math.floor(res.amount * (res.growth / 100) * skillFactor);
                        
                        if (amount > 0) this.addToInventory(pawn.inventory, itemType, amount);
                    }
                    
                    this.resources.delete(key);
                    if (this.resourceText.has(key)) {
                        this.resourceText.get(key)!.destroy();
                        this.resourceText.delete(key);
                    }
                }
                break;
            case TaskType.MINE:
                const ore = this.resources.get(key);
                if (ore) {
                    let itemType = ItemType.STONE;
                    if (ore.type === ResourceType.IRON_ORE) itemType = ItemType.IRON;
                    if (ore.type === ResourceType.GOLD_ORE) itemType = ItemType.GOLD;

                    this.addToInventory(pawn.inventory, itemType, 5);
                    this.resources.delete(key);
                    if (this.resourceText.has(key)) {
                        this.resourceText.get(key)!.destroy();
                        this.resourceText.delete(key);
                    }
                }
                break;
            case TaskType.HAUL:
                const container = this.structures.get(key);
                if (container && container.type === 'container') {
                    pawn.inventory.forEach(item => {
                        this.addToInventory(container.inventory, item.type, item.amount);
                    });
                    pawn.inventory = [];
                }
                break;
            case TaskType.EAT:
                pawn.needs[NeedType.FOOD] = 100;
                break;
            case TaskType.SLEEP:
                pawn.needs[NeedType.SLEEP] = 100;
                break;
            case TaskType.RECREATION:
                pawn.needs[NeedType.RECREATION] = 100;
                break;
        }

        if (this.blueprintGraphics.has(task.id)) {
            this.blueprintGraphics.get(task.id)!.destroy();
            this.blueprintGraphics.delete(task.id);
        }
        this.globalTasks = this.globalTasks.filter(t => t.id !== task.id);
        pawn.currentTaskId = null;
        pawn.state = 'idle';
    }

    private addToInventory(inv: Item[], type: ItemType, amount: number) {
        const existing = inv.find(i => i.type === type);
        if (existing) existing.amount += amount;
        else inv.push({ type, amount });
    }

    // --- Helpers ---

    private movePawn(pawn: PawnData, delta: number) {
        const task = this.globalTasks.find(t => t.id === pawn.currentTaskId);
        if (!task) { pawn.state = 'idle'; return; }

        const targetX = task.targetPos.x * TILE_SIZE + TILE_SIZE/2;
        const targetY = task.targetPos.y * TILE_SIZE + TILE_SIZE/2;
        const sprite = this.pawnSprites.get(pawn.id)!;
        
        const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, targetX, targetY);
        if (dist < 5) {
            pawn.state = (task.type === TaskType.SLEEP) ? 'sleeping' : 'working';
        } else {
            let speedMod = 1.0;
            if (pawn.needs[NeedType.FOOD] < 30) speedMod -= 0.1;
            if (pawn.needs[NeedType.SLEEP] < 30) speedMod -= 0.1;

            const speed = 0.15 * delta * speedMod;
            const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, targetX, targetY);
            sprite.x += Math.cos(angle) * speed;
            sprite.y += Math.sin(angle) * speed;
            pawn.pos.x = Math.floor(sprite.x / TILE_SIZE);
            pawn.pos.y = Math.floor(sprite.y / TILE_SIZE);
        }
    }

    private isLocationValid(x: number, y: number, allowResources: boolean = false): boolean {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
        
        // Impassable terrain
        const tile = this.tiles[y][x];
        if (tile === TileType.DEEP_WATER || tile === TileType.LAVA) return false;

        const key = `${x},${y}`;
        
        // Check blueprints
        if (this.blueprints.has(key)) return false; 
        
        // Check structures
        if (this.structures.has(key)) {
             const s = this.structures.get(key)!;
             if (s.type !== 'floor') return false; // Occupied by non-floor
        }
        
        // Check resources
        if (this.resources.has(key) && !allowResources) return false;

        return true;
    }

    private findStructureWithItem(type: ItemType): Position | null {
        for (const struct of this.structures.values()) {
            if (struct.inventory.some(i => i.type === type && i.amount > 0)) {
                return { x: struct.x, y: struct.y };
            }
        }
        return null;
    }

    private findNearestStructure(pos: Position, type: string): Position | null {
        let bestDist = Infinity;
        let best: Position | null = null;
        for (const struct of this.structures.values()) {
            if (struct.type === type) {
                const d = Phaser.Math.Distance.Between(pos.x, pos.y, struct.x, struct.y);
                if (d < bestDist) {
                    bestDist = d;
                    best = { x: struct.x, y: struct.y };
                }
            }
        }
        return best;
    }

    private drawSelectionBox(start: Position, end: Position) {
        this.selectionGraphics.clear();
        this.selectionGraphics.lineStyle(2, COLORS.SELECTION, 0.8);
        this.selectionGraphics.fillStyle(COLORS.SELECTION, 0.2);

        const x = Math.min(start.x, end.x) * TILE_SIZE;
        const y = Math.min(start.y, end.y) * TILE_SIZE;
        const w = (Math.abs(start.x - end.x) + 1) * TILE_SIZE;
        const h = (Math.abs(start.y - end.y) + 1) * TILE_SIZE;
        
        this.selectionGraphics.strokeRect(x, y, w, h);
        this.selectionGraphics.fillRect(x, y, w, h);
    }

    private handleCamera(delta: number) {
        const cursors = this.input.keyboard!.createCursorKeys();
        const speed = 0.5 * delta / this.cameras.main.zoom; // Adjust speed by zoom
        if (cursors.left.isDown || this.input.activePointer.x < 50) this.cameras.main.scrollX -= speed;
        if (cursors.right.isDown || this.input.activePointer.x > this.scale.width - 50) this.cameras.main.scrollX += speed;
        if (cursors.up.isDown || this.input.activePointer.y < 50) this.cameras.main.scrollY -= speed;
        if (cursors.down.isDown || this.input.activePointer.y > this.scale.height - 50) this.cameras.main.scrollY += speed;
    }

    private updateGhost() {
        const { x, y } = this.getTilePos(this.input.activePointer);
        
        if (this.interactionMode.type === 'build') {
             this.ghostBuilding.setVisible(true);
             this.ghostBuilding.setPosition(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
             
             const valid = this.isLocationValid(x, y, true);
             const rect = this.ghostBuilding.getAt(0) as Phaser.GameObjects.Rectangle;
             if (rect) rect.setFillStyle(valid ? 0x00ff00 : 0xff0000, 0.5);

        } else if (this.interactionMode.type === 'preset') {
            const preset = PRESETS.find(p => p.id === this.interactionMode.value);
            if (!preset) return;

            // Initialize ghost if not already (or if changed)
            if (this.ghostBuilding.list.length === 0) {
                 // Rebuild ghost for preset
                 preset.items.forEach(item => {
                    const bp = Object.values(BLUEPRINTS).find(b => b.type === item.blueprintId);
                    if (bp) {
                        const rect = this.add.rectangle(item.x * TILE_SIZE, item.y * TILE_SIZE, TILE_SIZE, TILE_SIZE, bp.color, 0.5);
                        const icon = this.add.text(item.x * TILE_SIZE, item.y * TILE_SIZE, bp.icon, {fontSize: '20px'}).setOrigin(0.5);
                        this.ghostBuilding.add([rect, icon]);
                    }
                 });
            }

            this.ghostBuilding.setVisible(true);
            this.ghostBuilding.setPosition(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
        } else {
             this.ghostBuilding.setVisible(false);
        }
    }

    private checkMouseHover() {
        const { x, y } = this.getTilePos(this.input.activePointer);
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
            this.game.events.emit(EVENTS.UPDATE_HOVER, null);
            return;
        }

        const key = `${x},${y}`;
        const res = this.resources.get(key);
        const struct = this.structures.get(key);
        const pawn = this.pawns.find(p => p.pos.x === x && p.pos.y === y);
        
        let tileName = 'Grass';
        const type = this.tiles[y][x];
        if (type === TileType.DIRT) tileName = 'Dirt';
        else if (type === TileType.ROCK) tileName = 'Rock Floor';
        else if (type === TileType.SHALLOW_WATER) tileName = 'Shallow Water';
        else if (type === TileType.DEEP_WATER) tileName = 'Deep Water';
        else if (type === TileType.MARSH) tileName = 'Marsh';
        else if (type === TileType.LAVA) tileName = 'Lava';

        this.game.events.emit(EVENTS.UPDATE_HOVER, { x, y, tileType: tileName, res, struct, pawn });
    }

    private setupEvents() {
        this.events.on('shutdown', () => {
            this.game.events.off(EVENTS.SET_INTERACTION_MODE);
            this.game.events.off(EVENTS.FOCUS_PAWN);
        });

        this.game.events.on(EVENTS.FOCUS_PAWN, (pawnId: string | null) => {
            if (!pawnId) {
                this.cameras.main.stopFollow();
                return;
            }
            const sprite = this.pawnSprites.get(pawnId);
            if (sprite) {
                this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
            } else {
                 this.cameras.main.stopFollow();
            }
        });
    }

    private emitUIUpdate() {
        const storage: Record<string, number> = {};
        this.structures.forEach(s => {
            s.inventory.forEach(item => {
                storage[item.type] = (storage[item.type] || 0) + item.amount;
            });
        });

        this.game.events.emit(EVENTS.UPDATE_UI, {
            pawns: this.pawns,
            tasksCount: this.globalTasks.length,
            storage
        });
    }
}
