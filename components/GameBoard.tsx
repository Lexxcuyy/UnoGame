import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { ICard, Player } from '../types';
import Card from './Card';
import Hand from './Hand';
import { ArrowLeft, MoreVertical, MessageCircle, Smile, Send, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import ColorPickerModal from './ColorPickerModal';

interface GameBoardProps {
  mode: 'classic' | 'no-mercy';
}

const GameBoard: React.FC<GameBoardProps> = ({ mode }) => {
  const {
    players,
    currentPlayerId,
    discardPile,
    direction,
    winner,
    initializeGame,
    playCard,
    drawCard,
    stackAccumulation,
    passTurn,
    aiPlay,
    error,
    isSwapping,
    swapHands,
    // New Logic Props
    activeColor,
    isChoosingColor,
    confirmColorSelection
  } = useGameStore();

  useEffect(() => {
    initializeGame(mode);
  }, [mode, initializeGame]);

  // AI Turn Logic
  useEffect(() => {
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (currentPlayer?.isBot && !winner && !isSwapping) {
      const timer = setTimeout(() => {
        aiPlay();
      }, 1500); // 1.5s thinking time
      return () => clearTimeout(timer);
    }
  }, [currentPlayerId, winner, players, aiPlay, isSwapping]);

  const userPlayer = players.find(p => p.id === 'user');
  const topCard = discardPile[discardPile.length - 1];
  const isUserTurn = currentPlayerId === 'user';
  const isNoMercy = mode === 'no-mercy';

  // Opponent Component
  const Opponent = ({ player }: { player: Player }) => {
    const isTurn = currentPlayerId === player.id;
    const canSwap = isSwapping && isUserTurn && player.id !== 'user';

    return (
      <div
        onClick={() => canSwap && swapHands(player.id)}
        className={clsx(
          "absolute flex flex-col items-center gap-2 transition-all duration-500 z-10",
          player.position === 'top' && "top-8 left-1/2 -translate-x-1/2",
          player.position === 'left' && "left-8 top-1/2 -translate-y-1/2 items-start",
          player.position === 'right' && "right-8 top-1/2 -translate-y-1/2 items-end",
          canSwap && "cursor-pointer hover:scale-110 z-50 brightness-125"
        )}
      >
        <div className={clsx(
          "relative p-1 rounded-full border-4 transition-colors",
          isTurn ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]" : "border-slate-700",
          canSwap && "animate-pulse border-green-400"
        )}>
          <img src={player.avatar} className="w-16 h-16 rounded-full bg-slate-800" alt={player.name} />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center font-bold text-sm text-white">
            {player.cardCount}
          </div>
        </div>
        <div className="text-white font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
          {player.name}
        </div>

        {/* Opponent Cards Stack (Visual Only) */}
        <div className="relative mt-2 h-16 w-12">
          {[...Array(Math.min(player.cardCount, 5))].map((_, i) => (
            <div key={i} className="absolute inset-0 bg-slate-800 rounded border border-slate-600 shadow-sm" style={{ top: i * -4, left: i * 2 }} />
          ))}
        </div>
      </div>
    );
  };

  if (winner) {
    if (winner === 'mercy_eliminated') {
      return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white z-[100]">
          <h1 className="text-6xl font-black text-red-600 mb-4 animate-pulse">ELIMINATED!</h1>
          <p className="text-2xl mb-8">Mercy Rule: Hand exceeded 25 cards.</p>
          <button onClick={() => initializeGame(mode)} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">Try Again</button>
        </div>
      )
    }
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white z-[100]">
        <h1 className="text-6xl font-black text-yellow-500 mb-4">WINNER!</h1>
        <p className="text-2xl mb-8">{players.find(p => p.id === winner)?.name} won the game!</p>
        <button onClick={() => initializeGame(mode)} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">Play Again</button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 flex flex-col">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black z-0" />

      {/* Table Surface */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[80vw] h-[60vh] bg-green-900/20 rounded-[100px] border-8 border-white/5 backdrop-blur-sm relative shadow-2xl transform perspective-[2000px] rotate-x-12">

          {/* Center Area */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-12">
            {/* Draw Pile */}
            <div
              onClick={() => isUserTurn && drawCard()}
              className={clsx(
                "relative w-32 h-48 rounded-xl bg-slate-800 border-2 border-slate-600 shadow-xl cursor-pointer hover:scale-105 transition-transform group",
                stackAccumulation > 0 && "animate-pulse shadow-[0_0_30px_rgba(255,0,0,0.5)] border-red-500"
              )}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-36 rounded-lg bg-red-600/20 border border-white/10" />
              </div>
              {/* Stack Indicator */}
              {stackAccumulation > 0 && (
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg animate-bounce">
                  +{stackAccumulation}
                </div>
              )}
            </div>

            {/* Discard Pile */}
            <div className="relative w-32 h-48">
              <AnimatePresence mode='popLayout'>
                {discardPile.slice(-5).map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0.5, y: -200, opacity: 0, rotate: Math.random() * 180 }}
                    animate={{ scale: 1, y: 0, opacity: 1, rotate: (Math.random() - 0.5) * 20 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="absolute inset-0"
                    style={{ zIndex: i }}
                  >
                    <Card card={card} size="lg" shadow />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Active Color Indicator (When Wild/Black is top) */}
      <div className={clsx(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[100px] -z-10 transition-colors duration-1000 opacity-50 pointer-events-none",
        activeColor === 'red' && "bg-red-600",
        activeColor === 'blue' && "bg-blue-600",
        activeColor === 'green' && "bg-green-600",
        activeColor === 'yellow' && "bg-yellow-500",
        activeColor === 'black' && "bg-purple-900", // Fallback/Dark
      )} />

      {/* Opponents */}
      {players.filter(p => p.id !== 'user').map(player => (
        <Opponent key={player.id} player={player} />
      ))}

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-xl z-50 flex items-center gap-2"
          >
            <MessageCircle size={20} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand Swap Prompt */}
      <AnimatePresence>
        {isSwapping && isUserTurn && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-8 py-4 rounded-full font-bold text-xl border border-white/20 shadow-2xl z-50"
          >
            Select a player to swap hands!
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Hand Area */}
      <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-center z-50 pointer-events-none">
        <div className="w-full max-w-3xl pointer-events-auto px-4 pb-4">
          <Hand
            cards={userPlayer?.hand || []}
            onPlayCard={playCard}
            isCurrentTurn={isUserTurn}
          />
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-50">
        <button
          onClick={() => isUserTurn && playCard('uno-shout')}
          className={clsx(
            "px-8 py-4 rounded-full font-black text-xl italic uppercase tracking-wider shadow-2xl transition-transform active:scale-95 hover:scale-105 border-4 border-white/20",
            isNoMercy ? "bg-gradient-to-r from-purple-600 to-red-600 text-white" : "bg-gradient-to-r from-yellow-400 to-orange-500 text-black"
          )}>
          UNO!
        </button>
      </div>

      <ColorPickerModal
        isOpen={isChoosingColor}
        onSelectColor={confirmColorSelection}
      />

    </div>
  );
};

export default GameBoard;