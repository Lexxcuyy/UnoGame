import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameBoard from './components/GameBoard';
import { GameMode } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');

  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentView('game');
  };

  const returnToMenu = () => {
    setCurrentView('menu');
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-900 text-white font-sans">
      {currentView === 'menu' ? (
        <MainMenu onStartGame={startGame} />
      ) : (
        <GameBoard mode={gameMode} onExit={returnToMenu} />
      )}
    </div>
  );
};

export default App;