import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ICard, Player } from '../types';
import Card from './Card';
import Hand from './Hand';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';
import ColorPickerModal from './ColorPickerModal';
import FlyingCardLayer from './FlyingCardLayer';
import { canPlayCard } from '../utils/rules';

interface GameBoardProps {
  mode: 'classic' | 'no-mercy';
  onExit?: () => void;
  onlineMode?: boolean;
  onOnlinePlayCard?: (cardId: string) => void;
  onOnlineDrawCard?: () => void;
  onOnlineConfirmColor?: (color: 'red' | 'yellow' | 'green' | 'blue') => void;
}

const MOBILE_BREAKPOINT = 768;

const MOBILE_Z_INDEX = {
  table: 10,
  opponents: 20,
  hand: 30,
  avatar: 40,
  uno: 50,
  modal: 200,
} as const;

const FlowArrowIcon = ({
  size = 44,
  color = '#9CA3AF',
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M7 24H29" stroke={color} strokeOpacity="0.9" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M24 15L38 24L24 33V15Z" fill={color} fillOpacity="0.9" />
  </svg>
);

interface MobileOpponentProps {
  player: Player;
  isTurn: boolean;
  lowEffects: boolean;
}

const MobileOpponent = React.memo(({ player, isTurn, lowEffects }: MobileOpponentProps) => {
  const isTop = player.position === 'top';
  const isLeft = player.position === 'left';
  const isRight = player.position === 'right';
  const displayCount = Math.min(player.cardCount, 6);

  const avatar = (
    <div className="relative z-30 flex flex-col items-center">
      <div
        className={clsx(
          'relative p-1 rounded-full border-2 bg-slate-900',
          isTurn ? 'border-yellow-400' : 'border-slate-700 opacity-90',
          !lowEffects && 'shadow-xl'
        )}
      >
        <img src={player.avatar} className="w-10 h-10 rounded-full object-cover bg-slate-800" alt={player.name} />
        <div
          className={clsx(
            'absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white',
            player.cardCount < 3 ? 'bg-red-500 text-white' : 'bg-white text-black'
          )}
        >
          {player.cardCount}
        </div>
      </div>
      <div className="mt-1 px-2 py-0.5 text-[10px] font-bold text-white bg-black/60 rounded-full border border-white/10 whitespace-nowrap">
        {player.name}
      </div>
    </div>
  );

  const stack = (
    <div className={clsx('relative z-10', isTop ? 'w-[240px] h-8' : 'w-16 h-[150px]')}>
      {Array.from({ length: displayCount }).map((_, i) => (
        <div
          key={`${player.id}-stack-${i}`}
          className="absolute"
          style={isTop ? { left: i * 24, top: 0, zIndex: i } : { top: i * 18, left: 0, zIndex: i }}
        >
          <Card isFaceDown size="sm" className="border-white/20" lowEffects={lowEffects} />
        </div>
      ))}
    </div>
  );

  if (isTop) {
    return (
      <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ zIndex: MOBILE_Z_INDEX.opponents }}>
        <div className="relative w-[240px] h-[108px]">
          <div className="absolute -top-10 left-0">{stack}</div>
          <div className="absolute top-12 left-1/2 -translate-x-1/2">{avatar}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'absolute top-[44%] -translate-y-1/2',
        isLeft ? 'left-0' : 'right-0'
      )}
      style={{ zIndex: MOBILE_Z_INDEX.opponents }}
    >
      <div className="relative w-[80px] h-[180px]">
        <div className={clsx('absolute -top-3 z-30', isLeft ? 'left-2' : 'right-2')}>{avatar}</div>
        <div className={clsx('absolute top-12 z-10', isLeft ? 'left-[-34px]' : 'right-[-34px]')}>{stack}</div>
      </div>
    </div>
  );
});

MobileOpponent.displayName = 'MobileOpponent';

interface DesktopOpponentProps {
  player: Player;
  isTurn: boolean;
  isCompactViewport: boolean;
}

const DesktopOpponent = React.memo(({ player, isTurn, isCompactViewport }: DesktopOpponentProps) => {
  const isTop = player.position === 'top';
  const isLeft = player.position === 'left';
  const isRight = player.position === 'right';
  const displayCount = Math.min(player.cardCount, 6);

  const wrapperClass = clsx(
    'absolute z-20',
    isTop && 'top-2 left-1/2 -translate-x-1/2',
    isLeft && (isCompactViewport ? 'left-2 top-1/2 -translate-y-1/2' : 'left-6 top-1/2 -translate-y-1/2'),
    isRight && (isCompactViewport ? 'right-2 top-1/2 -translate-y-1/2' : 'right-6 top-1/2 -translate-y-1/2')
  );

  const avatarSizeClass = isCompactViewport ? 'w-14 h-14' : 'w-16 h-16';

  return (
    <div className={wrapperClass}>
      <div className={clsx('flex items-center', isTop ? 'flex-col gap-2' : 'gap-3', isRight && 'flex-row-reverse')}>
        <div className="relative flex flex-col items-center z-20">
          <div
            className={clsx(
              'relative p-1 rounded-full border-4 transition-all duration-300 bg-slate-900 shadow-xl',
              isTurn ? 'border-yellow-400 shadow-[0_0_20px_5px_currentColor] scale-110' : 'border-slate-700 opacity-80'
            )}
          >
            <img src={player.avatar} className={clsx('rounded-full bg-slate-800 object-cover', avatarSizeClass)} alt={player.name} />
            <div
              className={clsx(
                'absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-black shadow-lg border-2 border-white',
                player.cardCount < 3 ? 'bg-red-500 text-white' : 'bg-white'
              )}
            >
              {player.cardCount}
            </div>
          </div>
          <div className="mt-1 text-white font-bold bg-black/60 rounded-full backdrop-blur-md border border-white/10 shadow-lg px-3 py-1 text-xs">
            {player.name}
          </div>
        </div>

        <div className={clsx('relative', isTop ? 'w-52 h-14' : 'w-12 h-28')}>
          {Array.from({ length: displayCount }).map((_, i) => (
            <div key={`${player.id}-stack-${i}`} className="absolute" style={isTop ? { left: i * 12, top: 0, zIndex: i } : { top: i * 12, left: 0, zIndex: i }}>
              <Card isFaceDown size="xs" className="shadow-md border-white/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

DesktopOpponent.displayName = 'DesktopOpponent';

const GameBoard: React.FC<GameBoardProps> = ({
  mode,
  onlineMode = false,
  onOnlinePlayCard,
  onOnlineDrawCard,
  onOnlineConfirmColor,
}) => {
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const players = useGameStore(state => state.players);
  const currentPlayerId = useGameStore(state => state.currentPlayerId);
  const discardPile = useGameStore(state => state.discardPile);
  const direction = useGameStore(state => state.direction);
  const winner = useGameStore(state => state.winner);
  const initializeGame = useGameStore(state => state.initializeGame);
  const localPlayCard = useGameStore(state => state.playCard);
  const localDrawCard = useGameStore(state => state.drawCard);
  const aiPlay = useGameStore(state => state.aiPlay);
  const error = useGameStore(state => state.error);
  const activeColor = useGameStore(state => state.activeColor);
  const isChoosingColor = useGameStore(state => state.isChoosingColor);
  const localConfirmColorSelection = useGameStore(state => state.confirmColorSelection);
  const isStackingChoice = useGameStore(state => state.isStackingChoice);
  const resolveStackChoice = useGameStore(state => state.resolveStackChoice);
  const stackAccumulation = useGameStore(state => state.stackAccumulation);
  const lastAction = useGameStore(state => state.lastAction);

  const prefersReducedMotion = useReducedMotion() ?? false;
  const mobileLowEffects = isMobileViewport || prefersReducedMotion;

  const playCard = React.useCallback((cardId: string) => {
    if (onlineMode) {
      onOnlinePlayCard?.(cardId);
      return;
    }
    localPlayCard(cardId);
  }, [onlineMode, onOnlinePlayCard, localPlayCard]);

  const drawCard = React.useCallback(() => {
    if (onlineMode) {
      onOnlineDrawCard?.();
      return;
    }
    localDrawCard();
  }, [onlineMode, onOnlineDrawCard, localDrawCard]);

  const confirmColorSelection = React.useCallback((color: 'red' | 'yellow' | 'green' | 'blue') => {
    if (onlineMode) {
      onOnlineConfirmColor?.(color);
      return;
    }
    localConfirmColorSelection(color);
  }, [onlineMode, onOnlineConfirmColor, localConfirmColorSelection]);

  useEffect(() => {
    if (!onlineMode) {
      initializeGame(mode);
    }
  }, [mode, initializeGame, onlineMode]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsCompactViewport(window.innerHeight < 760 || window.innerWidth < 1200);
      setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
    };
    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  useEffect(() => {
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!onlineMode && currentPlayer?.isBot && !winner) {
      const timer = setTimeout(() => aiPlay(), 1200);
      const safetyTimer = setTimeout(() => aiPlay(), 3500);
      return () => {
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    }
  }, [currentPlayerId, winner, players, aiPlay, onlineMode]);

  const userPlayer = useMemo(() => players.find(p => p.id === 'user'), [players]);
  const opponents = useMemo(() => players.filter(p => p.id !== 'user'), [players]);
  const isUserTurn = currentPlayerId === 'user';
  const isNoMercy = mode === 'no-mercy';
  const topDiscardCards = useMemo(() => discardPile.slice(-5), [discardPile]);
  const topCard = discardPile[discardPile.length - 1];
  const userHand = userPlayer?.hand || [];
  const hasPlayableUserCard = useMemo(() => {
    if (!isUserTurn || !topCard) return false;
    return userHand.some((card: ICard) => canPlayCard(card, {
      topCard,
      activeColor,
      stackAccumulation,
      mode,
    }));
  }, [isUserTurn, topCard, userHand, activeColor, stackAccumulation, mode]);

  const renderStackModal = () => (
    <AnimatePresence>
      {isStackingChoice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: mobileLowEffects ? 1 : 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: mobileLowEffects ? 1 : 0.9, opacity: 0 }}
            transition={{ duration: mobileLowEffects ? 0.15 : 0.25 }}
            className="bg-slate-900 border-2 border-red-500 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-md w-[92vw]"
            style={{ zIndex: MOBILE_Z_INDEX.modal }}
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
  );

  const renderErrorToast = () => (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ y: mobileLowEffects ? 8 : 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: mobileLowEffects ? 8 : 50, opacity: 0 }}
          transition={{ duration: mobileLowEffects ? 0.12 : 0.25 }}
          className={clsx(
            'absolute left-1/2 -translate-x-1/2 bg-red-600 text-white rounded-full font-bold shadow-xl z-[60] flex items-center gap-2',
            isMobileViewport ? 'bottom-28 px-4 py-2 text-sm' : 'bottom-32 px-6 py-3'
          )}
        >
          <MessageCircle size={18} />
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderActionBanner = () => (
    <AnimatePresence mode="wait">
      {lastAction && (
        <motion.div
          key={lastAction}
          initial={{ y: mobileLowEffects ? -8 : -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: mobileLowEffects ? -8 : -20, opacity: 0 }}
          transition={{ duration: mobileLowEffects ? 0.14 : 0.25 }}
          className={clsx(
            'absolute z-40',
            isMobileViewport
              ? 'top-2 left-1/2 -translate-x-1/2 scale-90'
              : isCompactViewport
                ? 'top-2 left-1/2 -translate-x-1/2 scale-90'
                : 'top-4 left-6'
          )}
        >
          <div className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium shadow-lg flex items-center gap-2">
            <div className={clsx('w-2 h-2 rounded-full bg-green-400', !mobileLowEffects && 'animate-pulse')} />
            {lastAction}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderDirectionMarkers = (mobile: boolean) => (
    <div
      className={clsx(
        'pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30',
        mobile
          ? 'top-[35%] w-[58vw] min-w-[190px] max-w-[250px] h-[46vh] min-h-[280px] max-h-[360px]'
          : isCompactViewport
            ? 'top-1/2 w-[88vw] h-[52vh]'
            : 'top-1/2 w-[80vw] h-[60vh]'
      )}
    >
      {([
        { key: 'bottom', pos: 'left-1/2 -translate-x-1/2 -bottom-3' },
        { key: 'right', pos: 'right-[-15px] top-1/2 -translate-y-1/2' },
        { key: 'top', pos: 'left-1/2 -translate-x-1/2 -top-3' },
        { key: 'left', pos: 'left-[-15px] top-1/2 -translate-y-1/2' },
      ] as const).map(marker => {
        const rotationByDirection: Record<'cw' | 'ccw', Record<'bottom' | 'right' | 'top' | 'left', number>> = {
          cw: {
            bottom: 0,   // bawah -> kanan
            right: -90,  // kanan -> atas
            top: 180,    // atas -> kiri
            left: 90,    // kiri -> bawah
          },
          ccw: {
            bottom: 180, // bawah -> kiri
            right: 90,   // kanan -> bawah
            top: 0,      // atas -> kanan
            left: -90,   // kiri -> atas
          },
        };

        return (
          <div
            key={marker.key}
            className={clsx(
              'absolute rounded-full border border-white/25 bg-black/45 shadow-md',
              marker.pos,
              mobile ? 'p-1' : 'p-1.5'
            )}
          >
            <div style={{ transform: `rotate(${rotationByDirection[direction][marker.key]}deg)` }}>
              <FlowArrowIcon size={mobile ? 24 : 28} />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (winner) {
    if (winner === 'mercy_eliminated') {
      return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white z-[100]">
          <h1 className="text-6xl font-black text-red-600 mb-4 animate-pulse">ELIMINATED!</h1>
          <p className="text-2xl mb-8">Mercy Rule: Hand exceeded 25 cards.</p>
          <button onClick={() => initializeGame(mode)} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">Try Again</button>
        </div>
      );
    }

    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-white z-[100]">
        <h1 className="text-6xl font-black text-yellow-500 mb-4">WINNER!</h1>
        <p className="text-2xl mb-8">{players.find(p => p.id === winner)?.name} won the game!</p>
        <button onClick={() => initializeGame(mode)} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">Play Again</button>
      </div>
    );
  }

  if (isMobileViewport) {
    const shouldGlowDrawPile = isUserTurn && !hasPlayableUserCard && !isStackingChoice && !isChoosingColor;
    const mobileControlBottom = `calc(env(safe-area-inset-bottom, 0px) + ${isCompactViewport ? 70 : 60}px)`;
    const mobileHandBottom = `calc(env(safe-area-inset-bottom, 0px) + ${isCompactViewport ? 160 : 138}px)`;
    const mobileHandHeight = isCompactViewport ? 182 : 196;

    return (
      <div className="relative w-full h-screen overflow-hidden bg-slate-950 text-white">
        <div
          className={clsx(
            'absolute inset-0 z-0',
            mobileLowEffects
              ? 'bg-gradient-to-b from-slate-900 to-black'
              : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black'
          )}
        />

        <FlyingCardLayer isMobileViewport={isMobileViewport} lowEffects={mobileLowEffects || isMobileViewport} />

        {renderActionBanner()}

        <div
          style={{ zIndex: MOBILE_Z_INDEX.table }}
          className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 w-[58vw] min-w-[190px] max-w-[250px] h-[46vh] min-h-[280px] max-h-[360px] rounded-[28px] border-2 border-white/10 bg-green-900/20"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
            <div
              onClick={() => isUserTurn && drawCard()}
              className={clsx(
                'relative w-14 h-[84px] rounded-lg bg-slate-800 border-2 border-slate-600 transition-transform',
                !mobileLowEffects && 'shadow-lg',
                isUserTurn && 'cursor-pointer active:scale-95',
                stackAccumulation > 0 && 'animate-pulse border-red-500',
                shouldGlowDrawPile && 'animate-pulse border-yellow-300 shadow-[0_0_22px_rgba(250,204,21,0.65)]'
              )}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-14 rounded-lg bg-red-600/20 border border-white/10" />
              </div>
            </div>

            <div className="relative w-14 h-[84px]">
              <AnimatePresence mode="popLayout">
                {topDiscardCards.map((card, i) => {
                  const deterministicRotate = (i - (topDiscardCards.length - 1) / 2) * 2;
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ scale: mobileLowEffects ? 0.92 : 0.65, opacity: 0, y: mobileLowEffects ? -6 : -12 }}
                      animate={{ scale: 1, opacity: 1, y: 0, rotate: deterministicRotate }}
                      exit={{ scale: 0.96, opacity: 0 }}
                      className="absolute inset-0"
                      style={{ zIndex: i }}
                      transition={{ duration: mobileLowEffects ? 0.12 : 0.2 }}
                    >
                      <Card card={card} size="sm" lowEffects={mobileLowEffects} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {renderDirectionMarkers(true)}

        {!mobileLowEffects && (
          <div
            className={clsx(
              'absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[48px] opacity-25 pointer-events-none w-28 h-28',
              activeColor === 'red' && 'bg-red-600',
              activeColor === 'blue' && 'bg-blue-600',
              activeColor === 'green' && 'bg-green-600',
              activeColor === 'yellow' && 'bg-yellow-500',
              activeColor === 'black' && 'bg-purple-900'
            )}
          />
        )}

        {opponents.map(player => (
          <MobileOpponent key={player.id} player={player} isTurn={currentPlayerId === player.id} lowEffects={mobileLowEffects} />
        ))}

        {renderErrorToast()}

        <div
          style={{
            zIndex: MOBILE_Z_INDEX.hand,
            bottom: mobileHandBottom,
            height: mobileHandHeight,
          }}
          className="absolute left-1/2 -translate-x-1/2 w-[calc(100vw-12px)] max-w-[680px] pointer-events-none"
        >
          <div className="w-full h-full pointer-events-auto">
            <Hand
              cards={userHand}
              onPlayCard={playCard}
              isCurrentTurn={isUserTurn}
              cardSize="md"
              isMobileLayout
              lowEffects={mobileLowEffects}
            />
          </div>
        </div>

        <div
          className="absolute left-0 right-0 px-4 flex items-end justify-between"
          style={{ zIndex: MOBILE_Z_INDEX.uno, bottom: mobileControlBottom }}
        >
          <div
            style={{ zIndex: MOBILE_Z_INDEX.avatar }}
            className={clsx(
              'flex items-center gap-2 transition-all duration-300',
              isUserTurn ? 'scale-105' : 'opacity-85 grayscale-[0.2]'
            )}
          >
            <div
              className={clsx(
                'relative p-1 rounded-full border-4 bg-slate-900',
                isUserTurn ? 'border-green-400' : 'border-slate-600',
                !mobileLowEffects && isUserTurn && 'shadow-[0_0_20px_5px_currentColor]',
                !mobileLowEffects && 'shadow-xl'
              )}
            >
              <img src={userPlayer?.avatar} className={clsx('rounded-full bg-slate-800 object-cover', isCompactViewport ? 'w-10 h-10' : 'w-11 h-11')} alt="You" />
              {isUserTurn && (
                <div className={clsx('absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap', !mobileLowEffects && 'animate-pulse')}>
                  YOUR TURN
                </div>
              )}
            </div>
            <span className={clsx('text-white font-bold bg-black/50 rounded-full border border-white/10', isCompactViewport ? 'px-2.5 py-0.5 text-sm' : 'px-3 py-1')}>You</span>
          </div>

          <button
            onClick={() => {}}
            aria-disabled="true"
            className={clsx(
              'rounded-full font-black italic uppercase tracking-wider transition-transform active:scale-95 border-2 border-white/20',
              !mobileLowEffects && 'shadow-2xl',
              isCompactViewport ? 'px-4 py-2 text-base' : 'px-5 py-2.5 text-lg',
              isNoMercy ? 'bg-gradient-to-r from-purple-600 to-red-600 text-white' : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
            )}
          >
            UNO!
          </button>
        </div>

        {renderStackModal()}

        <ColorPickerModal isOpen={isChoosingColor} onSelectColor={confirmColorSelection} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black z-0" />
      <FlyingCardLayer lowEffects={prefersReducedMotion} />

      {renderActionBanner()}

      <div className="absolute inset-0 flex items-center justify-center">
        {!prefersReducedMotion && (
          <motion.div
            animate={{ rotate: direction === 'cw' ? 360 : -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className={clsx(
              'absolute rounded-full border border-white/5 border-dashed pointer-events-none opacity-20',
              isCompactViewport ? 'w-[500px] h-[500px]' : 'w-[650px] h-[650px]'
            )}
          />
        )}

        <div
          className={clsx(
            'bg-green-900/20 border border-white/10 backdrop-blur-sm shadow-2xl relative',
            isCompactViewport ? 'w-[88vw] h-[52vh] rounded-[72px] border-8' : 'w-[80vw] h-[60vh] rounded-[100px] border-8'
          )}
        >
          <div className={clsx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center', isCompactViewport ? 'gap-8' : 'gap-12')}>
            <div
              onClick={() => isUserTurn && drawCard()}
              className={clsx(
                'relative rounded-xl bg-slate-800 border-2 border-slate-600 shadow-xl transition-transform group',
                isCompactViewport ? 'w-24 h-36' : 'w-32 h-48',
                isUserTurn && 'cursor-pointer active:scale-95',
                stackAccumulation > 0 && 'animate-pulse border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.5)]'
              )}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={clsx('rounded-lg bg-red-600/20 border border-white/10', isCompactViewport ? 'w-16 h-24' : 'w-24 h-36')} />
              </div>
            </div>

            <div className={clsx('relative', isCompactViewport ? 'w-24 h-36' : 'w-32 h-48')}>
              <AnimatePresence mode="popLayout">
                {topDiscardCards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0.5, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: (Math.random() - 0.5) * 14 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="absolute inset-0"
                    style={{ zIndex: i }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Card card={card} size={isCompactViewport ? 'md' : 'lg'} lowEffects={prefersReducedMotion} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {renderDirectionMarkers(false)}

      <div
        className={clsx(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] opacity-50 pointer-events-none',
          'w-48 h-48',
          activeColor === 'red' && 'bg-red-600',
          activeColor === 'blue' && 'bg-blue-600',
          activeColor === 'green' && 'bg-green-600',
          activeColor === 'yellow' && 'bg-yellow-500',
          activeColor === 'black' && 'bg-purple-900'
        )}
      />

      {opponents.map(player => (
        <DesktopOpponent key={player.id} player={player} isTurn={currentPlayerId === player.id} isCompactViewport={isCompactViewport} />
      ))}

      {renderErrorToast()}

      <div
        className={clsx(
          'absolute left-1/2 -translate-x-1/2 flex items-end justify-center z-50 pointer-events-none',
          isCompactViewport ? 'bottom-14 h-40 w-[94vw]' : 'bottom-20 h-44 w-[78vw]'
        )}
      >
        <div className="w-full max-w-4xl pointer-events-auto px-2">
          <Hand
            cards={userPlayer?.hand || []}
            onPlayCard={playCard}
            isCurrentTurn={isUserTurn}
            cardSize={isCompactViewport ? 'sm' : 'md'}
            lowEffects={prefersReducedMotion}
          />
        </div>
      </div>

      <div
        className={clsx(
          'absolute flex flex-col items-center gap-2 z-50 transition-all duration-300',
          isCompactViewport ? 'bottom-2 left-3' : 'bottom-4 left-6',
          isUserTurn ? 'scale-110' : 'opacity-80 grayscale-[0.3]'
        )}
      >
        <div className={clsx('relative p-1 rounded-full border-4 bg-slate-900 shadow-xl', isUserTurn ? 'border-green-400 shadow-[0_0_20px_5px_currentColor]' : 'border-slate-600')}>
          <img src={userPlayer?.avatar} className={clsx('rounded-full bg-slate-800 object-cover', isCompactViewport ? 'w-14 h-14' : 'w-16 h-16')} alt="You" />
        </div>
        <span className="text-white font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">You</span>
      </div>

      <div className={clsx('absolute z-50', isCompactViewport ? 'bottom-3 right-3' : 'bottom-5 right-5')}>
        <button
          onClick={() => {}}
          aria-disabled="true"
          className={clsx(
            'rounded-full font-black italic uppercase tracking-wider shadow-2xl transition-transform active:scale-95 border-4 border-white/20',
            'px-8 py-4 text-xl',
            isNoMercy ? 'bg-gradient-to-r from-purple-600 to-red-600 text-white' : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
          )}
        >
          UNO!
        </button>
      </div>

      {renderStackModal()}

      <ColorPickerModal isOpen={isChoosingColor} onSelectColor={confirmColorSelection} />
    </div>
  );
};

export default GameBoard;
