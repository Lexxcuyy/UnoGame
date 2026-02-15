import React, { useEffect, useMemo, useState } from 'react';
import MainMenu from './components/MainMenu';
import GameBoard from './components/GameBoard';
import { GameMode } from './types';
import FriendsLobby from './components/FriendsLobby';
import { useProfile } from './hooks/useProfile';
import { getSocket } from './utils/socket';
import { useGameStore } from './store/gameStore';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'menu' | 'game' | 'friends'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [onlineMode, setOnlineMode] = useState(false);
  const { profile, setName } = useProfile();
  const socket = useMemo(() => getSocket(), []);

  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setOnlineMode(false);
    setCurrentView('game');
  };

  const startOnlineGame = (mode: GameMode) => {
    setGameMode(mode);
    setOnlineMode(true);
    setCurrentView('game');
  };

  useEffect(() => {
    const onGameState = (snapshot: Record<string, unknown>) => {
      useGameStore.setState(prev => ({
        ...prev,
        ...snapshot,
        error: null,
        isChoosingColor: false,
        isStackingChoice: false,
        pendingCardPlayed: null,
      }));
    };

    socket.on('game:state', onGameState);
    return () => {
      socket.off('game:state', onGameState);
    };
  }, [socket]);

  useEffect(() => {
    if (currentView === 'game' && onlineMode) {
      socket.emit('game:requestState');
    }
  }, [currentView, onlineMode, socket]);

  const returnToMenu = () => {
    socket.emit('room:leave');
    setOnlineMode(false);
    setCurrentView('menu');
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-900 text-white font-sans">
      {currentView === 'menu' ? (
        <MainMenu
          onStartGame={startGame}
          onOpenFriends={() => setCurrentView('friends')}
          profileName={profile.name}
          onProfileNameChange={setName}
        />
      ) : currentView === 'friends' ? (
        <FriendsLobby
          profileName={profile.name}
          onProfileNameChange={setName}
          onBack={returnToMenu}
          onStartOnlineGame={startOnlineGame}
        />
      ) : (
        <GameBoard
          mode={gameMode}
          onExit={returnToMenu}
          onlineMode={onlineMode}
          onOnlinePlayCard={cardId => socket.emit('game:play', { cardId })}
          onOnlineDrawCard={() => socket.emit('game:draw')}
          onOnlineConfirmColor={() => {}}
        />
      )}
    </div>
  );
};

export default App;
