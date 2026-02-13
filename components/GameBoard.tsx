import React, { useEffect } from 'react';
import { GameMode, ICard, Player } from '../types';
import Card from './Card';
import Hand from './Hand';
import { useGameStore } from '../store/gameStore';
import { ArrowLeft, MoreVertical, MessageCircle, Smile, Send, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface GameBoardProps {
  mode: GameMode;
  onExit: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ mode, onExit }) => {
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
    swapHands
  } = useGameStore();

  useEffect(() => {
    initializeGame(mode);
  }, [mode]);

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

  const user = players.find(p => p.id === 'user');
  const opponents = players.filter(p => p.id !== 'user');
  const topCard = discardPile[discardPile.length - 1];
  const isNoMercy = mode === 'no-mercy';
  const isUserTurn = currentPlayerId === 'user';

  // Opponent component to keep things clean
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
        {/* Avatar & Status */}
        <div className="relative group">
          {/* Spotlight Effect */}
          {isTurn && (
            <motion.div
              layoutId="turn-spotlight"
              className="absolute -inset-4 bg-yellow-500/30 blur-xl rounded-full z-0"
              transition={{ duration: 0.5 }}
            />
          )}

          {/* Swap Target Indicator */}
          {canSwap && (
            <div className="absolute -inset-4 border-4 border-yellow-400 rounded-full animate-ping z-0" />
          )}

          <div className={clsx(
            "relative w-16 h-16 rounded-full p-0.5 ring-2 ring-slate-800 shadow-lg z-10 bg-slate-800",
            isTurn ? "ring-yellow-400 scale-110" : "grayscale-[0.5]",
            canSwap && "ring-white grayscale-0"
          )}>
            <img src={player.avatar} alt={player.name} className="w-full h-full rounded-full object-cover" />
            {/* Uno ! Alert */}
            {player.cardCount === 1 && (
              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full animate-bounce border-2 border-white">!</div>
            )}
          </div>

          <div className={clsx(
            "absolute -bottom-3 bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-slate-600 shadow-md min-w-[24px] text-center z-20",
            player.position === 'left' ? '-right-2' : player.position === 'right' ? '-left-2' : '-right-2'
          )}>
            {player.cardCount}
            {canSwap && <span className="ml-1 text-yellow-300">SWAP</span>}
          </div>
        </div>

        <div className={clsx("flex flex-col z-10", player.position === 'left' ? 'items-start' : player.position === 'right' ? 'items-end' : 'items-center')}>
          <span className="text-xs font-semibold text-slate-300 drop-shadow-md bg-black/40 px-2 rounded-full backdrop-blur-sm">{player.name}</span>

          {/* Card Stack Visual */}
          <div className="relative h-16 w-12 mt-2 perspective-[500px]">
            {Array.from({ length: Math.min(player.cardCount, 5) }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 left-0 w-8 h-12 bg-gradient-to-br from-red-900 to-slate-900 rounded-sm border border-white/10 shadow-sm"
                style={{
                  transform: `translateX(${i * 4}px) translateZ(${-i * 10}px) rotateY(${player.position === 'left' ? 10 : -10}deg)`,
                  zIndex: 5 - i
                }}
              />
            ))}
            {player.cardCount > 5 && (
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/50">+{player.cardCount - 5}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={clsx(
      "relative w-full h-screen overflow-hidden flex flex-col user-select-none",
      isNoMercy ? "bg-slate-950" : "bg-slate-900"
    )}>
      {/* Background */}
      <div className={clsx(
        "absolute inset-0 opacity-20 pointer-events-none",
        isNoMercy
          ? "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-black"
          : "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-black"
      )} />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button onClick={onExit} className="pointer-events-auto p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors">
          <ArrowLeft size={24} className="text-white" />
        </button>

        {isNoMercy && (
          <div className="flex flex-col items-center animate-pulse">
            <span className="text-xs font-black tracking-[0.2em] text-red-500 uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">No Mercy Mode</span>
            {stackAccumulation > 0 && (
              <span className="text-lg font-black text-yellow-400 drop-shadow-md">STACK: +{stackAccumulation}</span>
            )}
          </div>
        )}

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full font-bold shadow-xl border-2 border-white/20 z-[100]"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swap Prompt */}
        <AnimatePresence>
          {isSwapping && isUserTurn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-32 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-8 py-3 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(250,204,21,0.6)] z-[100] border-4 border-white animate-bounce"
            >
              SELECT AN OPPONENT TO SWAP HANDS!
            </motion.div>
          )}
        </AnimatePresence>

        <button className="pointer-events-auto p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors">
          <MoreVertical size={24} className="text-white" />
        </button>
      </div>

      {/* Main Game Area (3D Table) */}
      <div className="flex-1 relative w-full perspective-[1200px] flex items-center justify-center">
        {/* Table Surface transform */}
        <div className="relative w-full h-full max-w-4xl max-h-[800px] transform-style-3d rotate-x-10">

          {/* Opponents */}
          {opponents.map(opp => <Opponent key={opp.id} player={opp} />)}

          {/* Center Area */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-12 z-0 transform translate-z-0">

            {/* Direction Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <RefreshCw
                size={400}
                className={clsx(
                  "text-white transition-all duration-1000",
                  direction === 'ccw' && "scale-x-[-1]",
                  "animate-[spin_10s_linear_infinite]"
                )}
              />
            </div>

            {/* Draw Pile */}
            <div
              onClick={() => isUserTurn && drawCard()}
              className={clsx(
                "relative w-24 h-36 rounded-xl cursor-pointer transition-transform duration-100 active:scale-95 hover:scale-105 hover:-translate-y-2 shadow-2xl group",
                !isUserTurn && "opacity-80 cursor-default"
              )}
            >
              {/* Stack depth effect */}
              <div className="absolute top-1.5 left-1.5 w-full h-full bg-slate-800 rounded-xl border border-white/5" />
              <div className="absolute top-1 left-1 w-full h-full bg-slate-800 rounded-xl border border-white/5" />
              <div className="relative w-full h-full">
                <Card card={{ id: 'deck', type: 'number', color: 'black', value: 0 }} isFaceDown size="md" />
              </div>
            </div>

            {/* Discard Pile */}
            <div className="relative w-24 h-36 flex items-center justify-center">
              <AnimatePresence mode='popLayout'>
                {discardPile.slice(-3).map((card, index) => (
                  <motion.div
                    key={`${card.id}-${index}`} // Use index/id key to force remount on new card
                    layoutId={`discard-${card.id}`}
                    initial={{ opacity: 0, y: -200, scale: 1.5, rotate: Math.random() * 20 - 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      rotate: Math.random() * 10 - 5,
                      transition: { type: 'spring', stiffness: 200, damping: 20 }
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute bg-black/20 rounded-xl shadow-xl"
                    style={{ zIndex: index }}
                  >
                    <Card card={card} size="md" className="shadow-2xl" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* User Hand Area */}
          <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-center z-50 pointer-events-none">
            <div className="w-full max-w-3xl pointer-events-auto px-4 pb-4">
              {user && (
                <div className="flex flex-col items-center">
                  {/* Turn Indicator */}
                  {isUserTurn && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 text-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] animate-pulse"
                    >
                      It's Your Turn!
                    </motion.div>
                  )}
                  <Hand
                    cards={user.hand || []}
                    onPlayCard={playCard}
                    isCurrentTurn={isUserTurn}
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Chat & Extras UI (Bottom Corners) */}
      <div className="absolute bottom-6 left-6 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-3 border border-white/10 flex items-center gap-2 w-64 shadow-lg">
            <input type="text" placeholder="Type a message..." className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-400 w-full" />
            <Send size={16} className="text-blue-400 cursor-pointer hover:text-blue-300" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-50">
        <button className={clsx(
          "px-8 py-4 rounded-full font-black text-xl italic uppercase tracking-wider shadow-2xl transition-transform active:scale-95 hover:scale-105 border-4 border-white/20",
          isNoMercy ? "bg-gradient-to-r from-purple-600 to-red-600 text-white" : "bg-gradient-to-r from-yellow-400 to-orange-500 text-black"
        )}>
          UNO!
        </button>
      </div>

    </div>
  );
};

export default GameBoard;