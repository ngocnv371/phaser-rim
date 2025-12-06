
import React, { useEffect, useState } from 'react';
import { BLUEPRINTS, ACTIONS } from '../constants';
import { PawnData, EVENTS, ResourceEntity, StructureEntity } from '../types';
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
    const [selectedMode, setSelectedMode] = useState<{ type: 'build' | 'action', value: string }>({ type: 'action', value: ACTIONS.SELECT });
    const [activeTab, setActiveTab] = useState<'architect' | 'orders'>('orders');

    useEffect(() => {
        if (!game) return;

        const handleUpdate = (data: { pawns: PawnData[] }) => {
            setPawns([...data.pawns]);
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

    const setMode = (type: 'build' | 'action', value: string) => {
        setSelectedMode({ type, value });
        game?.events.emit(EVENTS.SET_INTERACTION_MODE, { type, value });
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex">
            {/* Tooltip */}
            {hoverData && (
                <div 
                    className="fixed bg-black/80 text-white p-2 rounded pointer-events-none z-50 text-sm border border-gray-500"
                    style={{ left: '10px', bottom: '10px' }} // Fixed position bottom left for stability
                >
                    <div className="font-bold text-gray-400 border-b border-gray-600 mb-1">
                        Tile [{hoverData.x}, {hoverData.y}]
                    </div>
                    <div>Terrain: {hoverData.tileType}</div>
                    {hoverData.res && <div className="text-green-400">{hoverData.res.type} ({hoverData.res.amount})</div>}
                    {hoverData.struct && <div className="text-blue-400">Structure: {hoverData.struct.type}</div>}
                    {hoverData.struct?.inventory && hoverData.struct.inventory.length > 0 && (
                         <div className="text-xs text-gray-400">Contains: {hoverData.struct.inventory.map(i => `${i.amount} ${i.type}`).join(', ')}</div>
                    )}
                    {hoverData.pawn && <div className="text-yellow-400">Pawn: {hoverData.pawn.name}</div>}
                </div>
            )}

            {/* Left Side - Pawn List */}
            <div className="p-4 flex flex-col gap-2 pointer-events-auto h-fit">
                {pawns.map(pawn => (
                    <div key={pawn.id} className="bg-gray-800 text-white p-2 rounded shadow-lg border border-gray-600 w-56 text-xs">
                        <div className="flex justify-between font-bold border-b border-gray-600 pb-1 mb-1">
                            <span>{pawn.name}</span>
                            <span className={pawn.state === 'idle' ? 'text-gray-400' : 'text-green-400'}>{pawn.state}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <div>🍗 {pawn.needs.Food.toFixed(0)}</div>
                            <div>💤 {pawn.needs.Sleep.toFixed(0)}</div>
                            <div>🎉 {pawn.needs.Recreation.toFixed(0)}</div>
                        </div>
                        {pawn.inventory.length > 0 && (
                            <div className="mt-1 pt-1 border-t border-gray-700 text-gray-300">
                                Carrying: {pawn.inventory.map(i => `${i.amount} ${i.type}`).join(', ')}
                            </div>
                        )}
                        <div className="mt-1 text-gray-500 italic truncate">
                           {pawn.currentTaskId ? 'Busy...' : 'Idle'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Spacer */}
            <div className="flex-grow" />

            {/* Right Side - Toolbar */}
            <div className="bg-gray-900 text-white w-64 border-l border-gray-700 pointer-events-auto flex flex-col">
                 <div className="flex border-b border-gray-700">
                    <button 
                        className={`flex-1 py-3 text-center font-bold ${activeTab === 'architect' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                        onClick={() => setActiveTab('architect')}
                    >
                        Architect
                    </button>
                    <button 
                        className={`flex-1 py-3 text-center font-bold ${activeTab === 'orders' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        Orders
                    </button>
                 </div>

                 <div className="p-2 grid grid-cols-2 gap-2 overflow-y-auto">
                    {activeTab === 'architect' && Object.values(BLUEPRINTS).map((bp) => (
                        <button
                            key={bp.type}
                            onClick={() => setMode('build', bp.type)}
                            className={`p-3 rounded flex flex-col items-center justify-center transition-colors border ${
                                selectedMode.value === bp.type 
                                ? 'bg-blue-900 border-blue-500' 
                                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                            }`}
                        >
                            <span className="text-2xl mb-1">{bp.icon}</span>
                            <span className="text-xs font-medium">{bp.name}</span>
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
                    <p>Right Click to Cancel Selection</p>
                 </div>
            </div>
        </div>
    );
};

export default GameUI;
