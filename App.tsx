import React, { useEffect, useMemo, useState, useCallback } from 'react';
import MainMenu from './components/MainMenu';
import GameBoard from './components/GameBoard';
import { GameMode, CardColor } from './types';
import FriendsLobby from './components/FriendsLobby';
import { useProfile } from './hooks/useProfile';
import { getSocket } from './utils/socket';
import { useGameStore } from './store/gameStore';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'menu' | 'game' | 'friends'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [onlineMode, setOnlineMode] = useState(false);
  const [pendingOnlineCardId, setPendingOnlineCardId] = useState<string | null>(null);
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

  const handleOnlinePlayCard = useCallback((cardId: string) => {
    // Check if the card is a black card that needs color selection
    const state = useGameStore.getState();
    const userPlayer = state.players.find(p => !p.isBot);
    const card = userPlayer?.hand?.find(c => c.id === cardId);

    if (card && card.color === 'black' && card.type !== 'x2') {
      // Show color picker, store the card ID for later
      setPendingOnlineCardId(cardId);
      useGameStore.setState({ isChoosingColor: true });
      return;
    }

    // Not a wild card — play directly
    socket.emit('game:play', { cardId });
  }, [socket]);

  const handleOnlineConfirmColor = useCallback((color: CardColor) => {
    if (pendingOnlineCardId) {
      socket.emit('game:play', { cardId: pendingOnlineCardId, chosenColor: color });
      setPendingOnlineCardId(null);
      useGameStore.setState({ isChoosingColor: false });
    }
  }, [socket, pendingOnlineCardId]);

  const returnToMenu = () => {
    socket.emit('room:leave');
    setOnlineMode(false);
    setPendingOnlineCardId(null);
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
          onOnlinePlayCard={handleOnlinePlayCard}
          onOnlineDrawCard={() => socket.emit('game:draw')}
          onOnlineConfirmColor={handleOnlineConfirmColor}
        />
      )}
    </div>
  );
};

export default App;

