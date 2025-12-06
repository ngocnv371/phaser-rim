
import React, { useEffect, useState } from 'react';
import { BLUEPRINTS, ACTIONS, ITEM_ICONS, PRESETS } from '../constants';
import { PawnData, EVENTS, ResourceEntity, StructureEntity, ItemType, ResourceType } from '../types';
import Phaser from 'phaser';

interface GameUIProps {
    game: Phaser.Game | null;
}

interface HoverData {
    x: number;
    y: number;
    tileType: string;
    res?: ResourceEntity;
    struct?: StructureEntity;
    pawn?: PawnData;
}

const GameUI: React.FC<GameUIProps> = ({ game }) => {
    const [pawns, setPawns] = useState<PawnData[]>([]);
    const [hoverData, setHoverData] = useState<HoverData | null>(null);
    const [selectedMode, setSelectedMode] = useState<{ type: 'build' | 'action' | 'preset', value: string }>({ type: 'action', value: ACTIONS.SELECT });
    const [activeTab, setActiveTab] = useState<'architect' | 'orders' | 'presets'>('orders');
    const [selectedPawnId, setSelectedPawnId] = useState<string | null>(null);
    const [storageItems, setStorageItems] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!game) return;

        const handleUpdate = (data: { pawns: PawnData[], storage: Record<string, number> }) => {
            setPawns([...data.pawns]);
            setStorageItems(data.storage);
        };
        const handleHover = (data: HoverData | null) => {
            setHoverData(data);
        };

        game.events.on(EVENTS.UPDATE_UI, handleUpdate);
        game.events.on(EVENTS.UPDATE_HOVER, handleHover);

        return () => {
            game.events.off(EVENTS.UPDATE_UI, handleUpdate);
            game.events.off(EVENTS.UPDATE_HOVER, handleHover);
        };
    }, [game]);

    const setMode = (type: 'build' | 'action' | 'preset', value: string) => {
        setSelectedMode({ type, value });
        game?.events.emit(EVENTS.SET_INTERACTION_MODE, { type, value });
    };

    const handlePawnClick = (pawnId: string) => {
        if (selectedPawnId === pawnId) {
            setSelectedPawnId(null);
            game?.events.emit(EVENTS.FOCUS_PAWN, null);
        } else {
            setSelectedPawnId(pawnId);
            game?.events.emit(EVENTS.FOCUS_PAWN, pawnId);
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col">
            {/* Top Bar */}
            <div className="h-16 bg-gray-900 border-b border-gray-700 flex items-center px-4 pointer-events-auto justify-between shadow-xl z-10">
                {/* Pawns List */}
                <div className="flex gap-2">
                    {pawns.map(pawn => (
                        <button 
                            key={pawn.id}
                            onClick={() => handlePawnClick(pawn.id)}
                            className={`flex flex-col items-center p-1 rounded w-16 transition-colors border ${
                                selectedPawnId === pawn.id ? 'bg-blue-900 border-blue-400' : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                            }`}
                        >
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: `#${pawn.color.toString(16)}` }}></div>
                            <span className="text-[10px] text-white font-bold truncate w-full text-center mt-1">{pawn.name}</span>
                            {/* Simple state indicator */}
                            <div className={`w-2 h-2 rounded-full mt-0.5 ${pawn.state === 'idle' ? 'bg-gray-500' : 'bg-green-500'}`}></div>
                        </button>
                    ))}
                </div>

                {/* Storage Overview */}
                <div className="flex gap-4 text-white text-sm bg-gray-800 px-4 py-2 rounded-full border border-gray-700 shadow-inner">
                    <span className="text-gray-400 font-bold mr-2">STORAGE</span>
                    {Object.values(ItemType).map(type => {
                        const amount = storageItems[type] || 0;
                        const icon = ITEM_ICONS[type] || '?';
                        return (
                            <div key={type} className="flex items-center gap-1" title={type}>
                                <span>{icon}</span>
                                <span className="font-mono">{amount}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-grow flex relative">
                 {/* Tooltip */}
                {hoverData && (
                    <div 
                        className="absolute bg-black/80 text-white p-2 rounded pointer-events-none z-50 text-sm border border-gray-500 shadow-xl"
                        style={{ left: '10px', bottom: '10px' }} 
                    >
                        <div className="font-bold text-gray-400 border-b border-gray-600 mb-1">
                            Tile [{hoverData.x}, {hoverData.y}]
                        </div>
                        <div>Terrain: {hoverData.tileType}</div>
                        {hoverData.res && (
                            <div className="text-green-400">
                                {hoverData.res.type} 
                                {(hoverData.res.type === ResourceType.TREE || hoverData.res.type === ResourceType.BERRY_BUSH || hoverData.res.type === ResourceType.POTATO_PLANT) && (
                                    <span className={hoverData.res.growth >= 80 ? 'text-green-300 ml-1' : 'text-gray-400 ml-1'}>
                                        ({hoverData.res.growth}%)
                                    </span>
                                )}
                            </div>
                        )}
                        {hoverData.struct && <div className="text-blue-400">Structure: {hoverData.struct.type}</div>}
                        {hoverData.struct?.inventory && hoverData.struct.inventory.length > 0 && (
                            <div className="text-xs text-gray-400">Contains: {hoverData.struct.inventory.map(i => `${i.amount} ${i.type}`).join(', ')}</div>
                        )}
                        {hoverData.pawn && <div className="text-yellow-400">Pawn: {hoverData.pawn.name}</div>}
                    </div>
                )}

                {/* Spacer */}
                <div className="flex-grow" />

                {/* Right Side - Toolbar */}
                <div className="bg-gray-900 text-white w-64 border-l border-gray-700 pointer-events-auto flex flex-col h-full shadow-2xl">
                    <div className="flex border-b border-gray-700">
                        <button 
                            className={`flex-1 py-3 text-center font-bold text-xs uppercase ${activeTab === 'architect' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                            onClick={() => setActiveTab('architect')}
                        >
                            Build
                        </button>
                        <button 
                            className={`flex-1 py-3 text-center font-bold text-xs uppercase ${activeTab === 'presets' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                            onClick={() => setActiveTab('presets')}
                        >
                            Presets
                        </button>
                        <button 
                            className={`flex-1 py-3 text-center font-bold text-xs uppercase ${activeTab === 'orders' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                            onClick={() => setActiveTab('orders')}
                        >
                            Orders
                        </button>
                    </div>

                    <div className="p-2 grid grid-cols-2 gap-2 overflow-y-auto content-start">
                        {activeTab === 'architect' && Object.values(BLUEPRINTS).filter(bp => !bp.isPlant).map((bp) => (
                            <button
                                key={bp.type}
                                onClick={() => setMode('build', bp.type)}
                                className={`p-3 rounded flex flex-col items-center justify-center transition-colors border ${
                                    selectedMode.value === bp.type && selectedMode.type === 'build'
                                    ? 'bg-blue-900 border-blue-500' 
                                    : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                                }`}
                            >
                                <span className="text-2xl mb-1">{bp.icon}</span>
                                <span className="text-xs font-medium">{bp.name}</span>
                                <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap justify-center gap-0.5">
                                    {bp.cost.map((c, i) => (
                                        <span key={i}>{c.amount}{ITEM_ICONS[c.type]}</span>
                                    ))}
                                </div>
                            </button>
                        ))}

                        {activeTab === 'presets' && PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => setMode('preset', preset.id)}
                                className={`p-3 rounded flex flex-col items-center justify-center transition-colors border col-span-2 ${
                                    selectedMode.value === preset.id && selectedMode.type === 'preset'
                                    ? 'bg-blue-900 border-blue-500' 
                                    : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                                }`}
                            >
                                <span className="text-sm font-bold">{preset.name}</span>
                                <span className="text-[10px] text-gray-400 mt-1 text-center">{preset.description}</span>
                            </button>
                        ))}

                        {activeTab === 'orders' && (
                            <>
                                <button
                                    onClick={() => setMode('action', ACTIONS.SELECT)}
                                    className={`p-3 rounded flex flex-col items-center justify-center border ${selectedMode.value === ACTIONS.SELECT ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                                >
                                    <span className="text-xl">👆</span>
                                    <span className="text-xs mt-1">Select</span>
                                </button>
                                <button
                                    onClick={() => setMode('action', ACTIONS.CHOP)}
                                    className={`p-3 rounded flex flex-col items-center justify-center border ${selectedMode.value === ACTIONS.CHOP ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                                >
                                    <span className="text-xl">🪓</span>
                                    <span className="text-xs mt-1">Chop Wood</span>
                                </button>
                                <button
                                    onClick={() => setMode('action', ACTIONS.HARVEST)}
                                    className={`p-3 rounded flex flex-col items-center justify-center border ${selectedMode.value === ACTIONS.HARVEST ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                                >
                                    <span className="text-xl">🧺</span>
                                    <span className="text-xs mt-1">Harvest</span>
                                </button>
                                <button
                                    onClick={() => setMode('action', ACTIONS.MINE)}
                                    className={`p-3 rounded flex flex-col items-center justify-center border ${selectedMode.value === ACTIONS.MINE ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                                >
                                    <span className="text-xl">⛏️</span>
                                    <span className="text-xs mt-1">Mine</span>
                                </button>
                                <button
                                    onClick={() => setMode('action', ACTIONS.CANCEL)}
                                    className={`p-3 rounded flex flex-col items-center justify-center border ${selectedMode.value === ACTIONS.CANCEL ? 'bg-red-900 border-red-500' : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                                >
                                    <span className="text-xl">🚫</span>
                                    <span className="text-xs mt-1">Cancel</span>
                                </button>
                            </>
                        )}
                    </div>
                    
                    <div className="mt-auto p-2 text-xs text-gray-500 border-t border-gray-700">
                        <p>WASD to Pan</p>
                        <p>Scroll to Zoom</p>
                        <p>Right Click to Cancel Selection</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameUI;