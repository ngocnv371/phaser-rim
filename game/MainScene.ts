
import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS, BLUEPRINTS, RESOURCE_ICONS, ACTIONS, NEEDS_DECAY_RATE } from '../constants';
import { PawnData, SkillType, NeedType, Task, TaskType, Position, EVENTS, ResourceType, ResourceEntity, StructureEntity, ItemType, Item } from '../types';
import { findPath } from './utils/pathfinding';

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
    private tiles: number[][] = []; // 0: grass, 1: dirt, 2: rock
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
    private interactionMode: { type: 'build' | 'action', value: string } = { type: 'action', value: ACTIONS.SELECT };
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

        this.generateMap();
        this.initPawns();
        this.setupInput();
        this.setupEvents();

        this.time.addEvent({ delay: 200, callback: () => this.emitUIUpdate(), loop: true });
        this.time.addEvent({ delay: 50, callback: () => this.checkMouseHover(), loop: true });
    }

    update(time: number, delta: number) {
        this.handleCamera(delta);
        this.updateGhost();
        this.updatePawns(delta);
    }

    // --- Generation ---

    private generateMap() {
        const graphics = this.add.graphics();
        this.mapLayer.add(graphics);

        for (let y = 0; y < MAP_HEIGHT; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                // Simple noise-like generation
                const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1);
                const isRock = Math.random() < 0.05 + (noise > 0.5 ? 0.1 : 0);
                const isDirt = Math.random() < 0.1;
                
                let color = COLORS.GRASS;
                let type = 0;

                if (isRock) {
                    color = COLORS.ROCK_FLOOR;
                    type = 2;
                } else if (isDirt) {
                    color = COLORS.DIRT;
                    type = 1;
                }
                
                this.tiles[y][x] = type;

                // Draw Tile
                graphics.fillStyle(color, 1);
                graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                // Resources
                this.spawnResource(x, y, type);
            }
        }
        
        // Grid lines
        graphics.lineStyle(1, 0x000000, 0.05);
        for(let x=0; x<=MAP_WIDTH; x++) graphics.lineBetween(x*TILE_SIZE, 0, x*TILE_SIZE, MAP_HEIGHT*TILE_SIZE);
        for(let y=0; y<=MAP_HEIGHT; y++) graphics.lineBetween(0, y*TILE_SIZE, MAP_WIDTH*TILE_SIZE, y*TILE_SIZE);
    }

    private spawnResource(x: number, y: number, tileType: number) {
        let res: ResourceEntity | null = null;
        let icon = '';

        if (tileType === 2) { // Rock floor
             if (Math.random() < 0.3) { res = { type: ResourceType.ROCK_CHUNK, amount: 20 }; icon = RESOURCE_ICONS.ROCK_CHUNK; }
             else if (Math.random() < 0.05) { res = { type: ResourceType.IRON_ORE, amount: 50 }; icon = RESOURCE_ICONS.IRON_ORE; }
             else if (Math.random() < 0.01) { res = { type: ResourceType.GOLD_ORE, amount: 50 }; icon = RESOURCE_ICONS.GOLD_ORE; }
        } else {
            if (Math.random() < 0.15) { res = { type: ResourceType.TREE, amount: 20 }; icon = RESOURCE_ICONS.TREE; }
            else if (Math.random() < 0.05) { res = { type: ResourceType.BERRY_BUSH, amount: 10 }; icon = RESOURCE_ICONS.BERRY_BUSH; }
        }

        if (res) {
            this.resources.set(`${x},${y}`, res);
            const text = this.add.text(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, icon, { fontSize: '20px' })
                .setOrigin(0.5);
            this.objectLayer.add(text);
            this.resourceText.set(`${x},${y}`, text);
        }
    }

    private initPawns() {
        const createPawn = (id: string, name: string, x: number, y: number) => {
            const pawn: PawnData = {
                id, name, color: COLORS.PAWN, pos: { x, y },
                skills: {
                    [SkillType.CONSTRUCTION]: { level: 5, exp: 0 },
                    [SkillType.MINING]: { level: 5, exp: 0 },
                    [SkillType.PLANTS]: { level: 5, exp: 0 },
                },
                needs: { [NeedType.FOOD]: 80, [NeedType.SLEEP]: 80, [NeedType.RECREATION]: 80 },
                inventory: [],
                currentTaskId: null,
                state: 'idle'
            };
            this.pawns.push(pawn);

            const container = this.add.container(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
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
        this.game.events.on(EVENTS.SET_INTERACTION_MODE, (mode: { type: 'build' | 'action', value: string }) => {
            this.interactionMode = mode;
            this.isDragging = false;
            this.ghostBuilding.setVisible(false);
            if (mode.type === 'build') {
                const bp = Object.values(BLUEPRINTS).find(b => b.type === mode.value);
                if (bp) {
                    (this.ghostBuilding.getAt(0) as Phaser.GameObjects.Rectangle).setFillStyle(bp.color, 0.5);
                    (this.ghostBuilding.getAt(1) as Phaser.GameObjects.Text).setText(bp.icon);
                }
            }
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonDown()) {
                 // Cancel current action
                 this.isDragging = false;
                 return;
            }
            if (this.interactionMode.type === 'action') {
                this.isDragging = true;
                this.dragStart = this.getTilePos(pointer);
            } else if (this.interactionMode.type === 'build') {
                const { x, y } = this.getTilePos(pointer);
                this.createBlueprint(x, y, this.interactionMode.value);
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
        const ghostRect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.5);
        const ghostIcon = this.add.text(0, 0, '', { fontSize: '20px' }).setOrigin(0.5);
        this.ghostBuilding.add([ghostRect, ghostIcon]);
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

        // Prevent Duplicate Tasks
        if (this.globalTasks.some(t => t.targetPos.x === x && t.targetPos.y === y && t.type !== TaskType.HAUL)) return;

        if (mode === ACTIONS.CANCEL) {
             // Find task and remove
             const taskIndex = this.globalTasks.findIndex(t => t.targetPos.x === x && t.targetPos.y === y);
             if (taskIndex !== -1) {
                 const t = this.globalTasks[taskIndex];
                 // Unassign pawn if needed
                 if (t.assignedPawnId) {
                     const p = this.pawns.find(p => p.id === t.assignedPawnId);
                     if (p) { p.currentTaskId = null; p.state = 'idle'; }
                 }
                 this.globalTasks.splice(taskIndex, 1);
                 // Clear visual
                 if (this.blueprintGraphics.has(t.id)) {
                     this.blueprintGraphics.get(t.id)!.destroy();
                     this.blueprintGraphics.delete(t.id);
                 }
                 // Clear blueprint data
                 if (this.blueprints.has(key)) this.blueprints.delete(key);
             }
             return;
        }

        const res = this.resources.get(key);

        if (mode === ACTIONS.CHOP && res?.type === ResourceType.TREE) {
            this.createTask(x, y, TaskType.CHOP, 100, 0xff0000);
        } else if (mode === ACTIONS.HARVEST && res?.type === ResourceType.BERRY_BUSH) {
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
        
        // Visual Marker
        const rect = this.add.rectangle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, color, 0.3);
        this.mapLayer.add(rect);
        this.blueprintGraphics.set(id, rect);

        if (type === TaskType.BUILD) {
             this.blueprints.set(`${x},${y}`, this.globalTasks[this.globalTasks.length-1]);
        }
    }

    private createBlueprint(x: number, y: number, type: string) {
        if (!this.isLocationValid(x, y)) return;
        const bp = Object.values(BLUEPRINTS).find(b => b.type === type);
        if (bp) {
            this.createTask(x, y, TaskType.BUILD, bp.workToBuild, bp.color, type);
        }
    }

    // --- Logic Loop ---

    private updatePawns(delta: number) {
        this.pawns.forEach(pawn => {
            // Decay Needs
            for (const n in pawn.needs) {
                pawn.needs[n as NeedType] -= (NEEDS_DECAY_RATE[n as keyof typeof NEEDS_DECAY_RATE] || 0.01) * (delta / 16);
                if (pawn.needs[n as NeedType] < 0) pawn.needs[n as NeedType] = 0;
            }

            // AI State Machine
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
            // Find food in containers
            const foodContainer = this.findStructureWithItem(ItemType.FOOD);
            if (foodContainer) {
                this.assignSelfTask(pawn, TaskType.EAT, foodContainer, 50);
                return;
            }
        }
        
        if (pawn.needs[NeedType.SLEEP] < 30) {
             const bed = this.findNearestStructure(pawn.pos, 'bed');
             const target = bed ? { x: bed.x, y: bed.y } : pawn.pos; // Sleep on ground if no bed
             this.assignSelfTask(pawn, TaskType.SLEEP, { x: target.x, y: target.y }, 500); // Long sleep
             return;
        }

        // 2. Hauling (If inventory has items)
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
            // Find closest? For now, just first.
            const task = validTasks[0];
            task.assignedPawnId = pawn.id;
            pawn.currentTaskId = task.id;
            pawn.state = 'moving';
            return;
        }

        // 4. Recreation
        if (pawn.needs[NeedType.RECREATION] < 50) {
            // Find a tree or rock to look at
            // Mock logic: pick random tile nearby
            this.assignSelfTask(pawn, TaskType.RECREATION, pawn.pos, 200);
            return;
        }
    }

    private assignSelfTask(pawn: PawnData, type: TaskType, pos: Position, work: number) {
        const id = `self_${pawn.id}_${Date.now()}`;
        const task: Task = { id, type, targetPos: pos, workAmount: work, assignedPawnId: pawn.id };
        // We don't push self-tasks to global queue usually, but to simplify logic loop:
        this.globalTasks.push(task);
        pawn.currentTaskId = id;
        pawn.state = 'moving';
    }

    private workTask(pawn: PawnData, delta: number) {
        const task = this.globalTasks.find(t => t.id === pawn.currentTaskId);
        if (!task) { pawn.state = 'idle'; return; }

        task.workAmount -= 1 * (delta / 16);

        // Visual feedback
        if (Math.random() < 0.05) {
             // Shake effect or particles could go here
        }

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
                        const icon = this.add.text(task.targetPos.x * TILE_SIZE + TILE_SIZE/2, task.targetPos.y * TILE_SIZE + TILE_SIZE/2, bp.icon, {fontSize: '20px'}).setOrigin(0.5);
                        this.structureSprites.set(key, this.add.container(0,0, [icon])); // Wrapper
                        this.objectLayer.add(icon);
                        
                        this.structures.set(key, {
                            id: key, type: task.structureId, x: task.targetPos.x, y: task.targetPos.y, health: 100, inventory: []
                        });
                        
                        // If it's a container, maybe start with some emergency rations?
                        if(task.structureId === 'container') {
                             this.structures.get(key)!.inventory.push({ type: ItemType.FOOD, amount: 50 });
                        }
                    }
                    this.blueprints.delete(key);
                }
                break;
            case TaskType.HARVEST:
            case TaskType.CHOP:
            case TaskType.MINE:
                const res = this.resources.get(key);
                if (res) {
                    let itemType = ItemType.WOOD;
                    if (res.type === ResourceType.BERRY_BUSH) itemType = ItemType.FOOD;
                    if (res.type === ResourceType.ROCK_CHUNK) itemType = ItemType.STONE;
                    if (res.type === ResourceType.IRON_ORE) itemType = ItemType.IRON;
                    if (res.type === ResourceType.GOLD_ORE) itemType = ItemType.GOLD;

                    this.addToInventory(pawn.inventory, itemType, 5); // Flat amount for now
                    
                    this.resources.delete(key);
                    if (this.resourceText.has(key)) {
                        this.resourceText.get(key)!.destroy();
                        this.resourceText.delete(key);
                    }
                }
                break;
            case TaskType.HAUL:
                // Dump inventory to container
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
                // Remove food from container?
                // For simplicity, infinite food in containers for now or reduce logic
                const foodCont = this.structures.get(key);
                if(foodCont) {
                    // Logic to reduce food count
                }
                break;
            case TaskType.SLEEP:
                pawn.needs[NeedType.SLEEP] = 100;
                break;
            case TaskType.RECREATION:
                pawn.needs[NeedType.RECREATION] = 100;
                break;
        }

        // Cleanup
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
            const speed = 0.15 * delta;
            const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, targetX, targetY);
            sprite.x += Math.cos(angle) * speed;
            sprite.y += Math.sin(angle) * speed;
            pawn.pos.x = Math.floor(sprite.x / TILE_SIZE);
            pawn.pos.y = Math.floor(sprite.y / TILE_SIZE);
        }
    }

    private isLocationValid(x: number, y: number): boolean {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
        const key = `${x},${y}`;
        // Can't build on water (not implemented yet) or existing structures
        if (this.structures.has(key) || this.blueprints.has(key)) return false;
        // Can't build wall on rock?
        if (this.tiles[y][x] === 2) return false; 
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
        const speed = 0.5 * delta;
        if (cursors.left.isDown || this.input.activePointer.x < 50) this.cameras.main.scrollX -= speed;
        if (cursors.right.isDown || this.input.activePointer.x > this.scale.width - 50) this.cameras.main.scrollX += speed;
        if (cursors.up.isDown || this.input.activePointer.y < 50) this.cameras.main.scrollY -= speed;
        if (cursors.down.isDown || this.input.activePointer.y > this.scale.height - 50) this.cameras.main.scrollY += speed;
    }

    private updateGhost() {
        if (this.interactionMode.type !== 'build') return;
        const { x, y } = this.getTilePos(this.input.activePointer);
        this.ghostBuilding.setVisible(true);
        this.ghostBuilding.setPosition(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
        
        const valid = this.isLocationValid(x, y);
        (this.ghostBuilding.getAt(0) as Phaser.GameObjects.Rectangle).setFillStyle(valid ? 0x00ff00 : 0xff0000, 0.5);
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
        const tileType = this.tiles[y][x] === 2 ? 'Rock Floor' : (this.tiles[y][x] === 1 ? 'Dirt' : 'Grass');

        this.game.events.emit(EVENTS.UPDATE_HOVER, { x, y, tileType, res, struct, pawn });
    }

    private setupEvents() {
        this.events.on('shutdown', () => {
            this.game.events.off(EVENTS.SET_INTERACTION_MODE);
        });
    }

    private emitUIUpdate() {
        this.game.events.emit(EVENTS.UPDATE_UI, {
            pawns: this.pawns,
            tasksCount: this.globalTasks.length
        });
    }
}
