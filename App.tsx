import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import MainScene from './game/MainScene';
import GameUI from './components/GameUI';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from './constants';

const App: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameInstance, setGameInstance] = useState<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#1a1a1a',
        scene: [MainScene],
        physics: {
            default: 'arcade',
            arcade: {
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };

    const game = new Phaser.Game(config);
    setGameInstance(game);

    return () => {
        game.destroy(true);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-900">
      <div ref={gameRef} className="absolute inset-0" />
      <GameUI game={gameInstance} />
    </div>
  );
};

export default App;