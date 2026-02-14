import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { ICard, Player } from '../types';
import Card from './Card';
import Hand from './Hand';
import { ArrowLeft, MoreVertical, MessageCircle, Smile, Send, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import ColorPickerModal from './ColorPickerModal';
import FlyingCardLayer from './FlyingCardLayer';

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
    // stackAccumulation, // Accessed via selector below
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
  // AI Turn Logic & Safety Net
  useEffect(() => {
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (currentPlayer?.isBot && !winner && !isSwapping) {
      // Primary AI Trigger
      const timer = setTimeout(() => {
        aiPlay();
      }, 1500); // 1.5s thinking time

      // Safety Net: If bot gets stuck for 4s, force retry
      const safetyTimer = setTimeout(() => {
        console.warn("Bot appears stuck, forcing AI play...");
        aiPlay();
      }, 4000);

      return () => {
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    }
  }, [currentPlayerId, winner, players, aiPlay, isSwapping]);

  const userPlayer = players.find(p => p.id === 'user');
  const topCard = discardPile[discardPile.length - 1];
  const isUserTurn = currentPlayerId === 'user';
  const isNoMercy = mode === 'no-mercy';

  // Opponent Component (Refactored for Fan Layout)
  const Opponent: React.FC<{ player: Player }> = ({ player }) => {
    const isTurn = currentPlayerId === player.id;
    const canSwap = isSwapping && isUserTurn && player.id !== 'user';

    // Calculate limits for performance
    const renderLimit = 15; // Increased for better fan effect
    const displayCount = Math.min(player.cardCount, renderLimit);

    // Layout logic
    const isTop = player.position === 'top';
    const isLeft = player.position === 'left';
    const isRight = player.position === 'right';

    return (
      <div
        onClick={() => canSwap && swapHands(player.id)}
        className={clsx(
          "absolute flex flex-col items-center gap-4 transition-all duration-500 z-10",
          isTop && "top-[-50px] left-1/2 -translate-x-1/2 flex-col-reverse", // Reverse for top so cards are below avatar
          isLeft && "left-8 top-1/2 -translate-y-1/2 flex-row items-center",
          isRight && "right-8 top-1/2 -translate-y-1/2 flex-row-reverse items-center",
          canSwap && "cursor-pointer hover:scale-110 z-50 brightness-125"
        )}
      >
        {/* Avatar & Info */}
        <div className="relative flex flex-col items-center z-20">
          <div className={clsx(
            "relative p-1 rounded-full border-4 transition-all duration-300 bg-slate-900 shadow-xl group",
            isTurn ? "border-yellow-400 shadow-[0_0_20px_5px_currentColor] scale-110" : "border-slate-700 opacity-60",
            canSwap && "animate-pulse border-green-400"
          )}>
            <img src={player.avatar} className="w-20 h-20 rounded-full bg-slate-800 object-cover" alt={player.name} />

            {/* Active Turn Badge */}
            {isTurn && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap animate-pulse">
                THINKING...
              </div>
            )}

            {/* Enhanced Card Count Badge (Outside) */}
            <div className={clsx(
              "absolute -bottom-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg text-black shadow-lg border-2 border-white transform transition-transform group-hover:scale-110",
              player.cardCount < 3 ? "bg-red-500 text-white animate-bounce" : "bg-white"
            )}>
              {player.cardCount}
            </div>
          </div>
          <div className="mt-2 text-white font-bold bg-black/60 px-4 py-1 rounded-full backdrop-blur-md text-sm border border-white/10 shadow-lg">
            {player.name}
          </div>
        </div>

        {/* Fanned Cards */}
        <div className={clsx(
          "relative flex items-center justify-center",
          isTop && "h-24 w-80 -mt-2",
          (isLeft || isRight) && "h-80 w-24 -mx-4"
        )}>
          {Array.from({ length: displayCount }).map((_, i) => {
            let style = {};
            const totalArc = isTop ? 120 : 90;
            const startAngle = -totalArc / 2;
            const step = totalArc / (Math.max(displayCount, 1));
            const angle = startAngle + (i * step);

            if (isTop) {
              // Arc Downwards
              style = {
                transform: `rotate(${angle}deg) translateY(40px)`,
                transformOrigin: "top center",
                zIndex: i
              };
            } else if (isLeft) {
              // Vertical Arc (Rightwards)
              style = {
                transform: `rotate(${angle}deg) translateX(40px) rotate(90deg)`,
                transformOrigin: "center left",
                zIndex: i
              };
            } else if (isRight) {
              // Vertical Arc (Leftwards)
              style = {
                transform: `rotate(${-angle}deg) translateX(-40px) rotate(-90deg)`,
                transformOrigin: "center right",
                zIndex: i
              };
            }

            return (
              <div key={i} className="absolute inset-0 flex items-center justify-center" style={{ ...style }}>
                <Card isFaceDown size="xs" className="shadow-md border-white/20" />
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  // New State Store Selectors
  const isStackingChoice = useGameStore(state => state.isStackingChoice);
  const resolveStackChoice = useGameStore(state => state.resolveStackChoice);
  const stackAccumulation = useGameStore(state => state.stackAccumulation);
  const lastAction = useGameStore(state => state.lastAction);

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

      {/* FX Layers */}
      <FlyingCardLayer />

      {/* Action Log Banner */}
      <AnimatePresence mode='wait'>
        {lastAction && (
          <motion.div
            key={lastAction}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {lastAction}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Surface with Direction Ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Direction Ring */}
        <motion.div
          animate={{ rotate: direction === 'cw' ? 360 : -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute w-[650px] h-[650px] rounded-full border border-white/5 border-dashed pointer-events-none opacity-20"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/50 rounded-full blur-[2px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/50 rounded-full blur-[2px]" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white/50 rounded-full blur-[2px]" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white/50 rounded-full blur-[2px]" />
        </motion.div>

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
                {discardPile.slice(-5).map((card, i) => {
                  // Determine entry position based on playedBy ID
                  let initialX = 0;
                  let initialY = -200; // Default fallback (fly down)

                  if (card.playedBy === 'user') { initialX = 0; initialY = 500; }
                  else if (card.playedBy === 'bot1') { initialX = 0; initialY = -500; } // Top
                  else if (card.playedBy === 'bot2') { initialX = -500; initialY = 0; } // Left
                  else if (card.playedBy === 'bot3') { initialX = 500; initialY = 0; } // Right

                  return (
                    <motion.div
                      key={card.id}
                      initial={{ scale: 0.5, x: initialX, y: initialY, opacity: 0, rotate: Math.random() * 180 }}
                      animate={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: (Math.random() - 0.5) * 20 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="absolute inset-0"
                      style={{ zIndex: i }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <Card card={card} size="lg" shadow />
                    </motion.div>
                  );
                })}
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

      {/* Stack Choice Modal */}
      <AnimatePresence>
        {isStackingChoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border-2 border-red-500 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-md w-full"
            >
              <h2 className="text-3xl font-black text-white uppercase italic tracking-wider">Incoming +{stackAccumulation}!</h2>
              <p className="text-slate-400 text-center">You have a card that can stack! Do you want to play it or take the hit?</p>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => resolveStackChoice('take')}
                  className="p-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition border border-slate-600"
                >
                  Take Hit (+{stackAccumulation})
                </button>
                <button
                  onClick={() => resolveStackChoice('stack')}
                  className="p-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-black hover:scale-105 transition shadow-lg"
                >
                  STACK IT!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* User Avatar & Status (Bottom Left) */}
      <div className={clsx(
        "absolute bottom-8 left-8 flex flex-col items-center gap-2 z-50 transition-all duration-300",
        isUserTurn ? "scale-110" : "opacity-80 grayscale-[0.3]"
      )}>
        <div className={clsx(
          "relative p-1 rounded-full border-4 bg-slate-900 shadow-xl",
          isUserTurn ? "border-green-400 shadow-[0_0_20px_5px_currentColor]" : "border-slate-600"
        )}>
          <img src={userPlayer?.avatar} className="w-16 h-16 rounded-full bg-slate-800 object-cover" alt="You" />
          {isUserTurn && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap animate-pulse">
              YOUR TURN
            </div>
          )}
        </div>
        <span className="text-white font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">You</span>
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