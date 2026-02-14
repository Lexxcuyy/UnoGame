import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { clsx } from 'clsx';

interface FlyingCardLayerProps {
  isMobileViewport?: boolean;
  lowEffects?: boolean;
}

interface AnimCard {
  id: string;
  kind: 'draw' | 'play';
  start: { x: number; y: number; rotate: number };
  end: { x: number; y: number; rotate: number };
  delay: number;
  rotationOffset: number;
  spreadX: number;
  spreadY: number;
  scaleTo: number;
}

const getCoords = (pid: string, width: number, height: number) => {
  switch (pid) {
    case 'user':
      return { x: width * 0.5, y: height * 0.9, rotate: 0 };
    case 'bot1':
      return { x: width * 0.5, y: height * 0.12, rotate: 180 };
    case 'bot2':
      return { x: width * 0.1, y: height * 0.5, rotate: 90 };
    case 'bot3':
      return { x: width * 0.9, y: height * 0.5, rotate: -90 };
    default:
      return { x: width * 0.5, y: height * 0.5, rotate: 0 };
  }
};

const FlyingCardLayer: React.FC<FlyingCardLayerProps> = ({ isMobileViewport = false, lowEffects = false }) => {
  const lastEvent = useGameStore(state => state.lastEvent);
  const clearLastEvent = useGameStore(state => state.clearLastEvent);
  const reduce = lowEffects || isMobileViewport;

  const [animations, setAnimations] = useState<AnimCard[]>([]);
  const timerRefs = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timerRefs.current.forEach(timerId => window.clearTimeout(timerId));
      timerRefs.current = [];
    };
  }, []);

  useEffect(() => {
    if (!lastEvent) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    if (lastEvent.type === 'draw' || lastEvent.type === 'stack') {
      const start = getCoords('deck', width, height);
      const end = getCoords(lastEvent.playerId, width, height);

      const maxCards = isMobileViewport ? 7 : reduce ? 6 : 14;
      const drawCount = Math.max(1, Math.min(lastEvent.count, maxCards));
      const stagger = isMobileViewport ? 0.022 : reduce ? 0.028 : 0.06;
      const spread = isMobileViewport ? 20 : reduce ? 28 : 46;
      const midLift = isMobileViewport ? 26 : reduce ? 34 : 54;

      const newAnims = Array.from({ length: drawCount }).map((_, i) => ({
        id: `${Date.now()}-${i}`,
        kind: 'draw' as const,
        start,
        end,
        delay: i * stagger,
        rotationOffset: (i - (drawCount - 1) / 2) * (reduce ? 5 : 9),
        spreadX: ((i % 2 === 0 ? 1 : -1) * spread * (i / Math.max(1, drawCount - 1))) || 0,
        spreadY: -midLift - i * (isMobileViewport ? 1.5 : 2),
        scaleTo: 0.96 + (i % 3) * 0.02,
      }));

      setAnimations(prev => [...prev, ...newAnims]);

      const maxDelay = newAnims.length * stagger;
      const timeout = window.setTimeout(() => {
        setAnimations(prev => prev.filter(p => !newAnims.some(n => n.id === p.id)));
        clearLastEvent();
      }, (isMobileViewport ? 380 : reduce ? 480 : 900) + maxDelay * 1000);

      timerRefs.current.push(timeout);
      return;
    }

    if (lastEvent.type === 'play') {
      const start = getCoords(lastEvent.playerId, width, height);
      const end = { x: width * 0.5, y: height * (isMobileViewport ? 0.46 : 0.5), rotate: 0 };
      const playAnim: AnimCard = {
        id: `${Date.now()}-play`,
        kind: 'play',
        start,
        end,
        delay: 0,
        rotationOffset: 0,
        spreadX: 0,
        spreadY: isMobileViewport ? -22 : -30,
        scaleTo: 1,
      };

      setAnimations(prev => [...prev, playAnim]);

      const timeout = window.setTimeout(() => {
        setAnimations(prev => prev.filter(p => p.id !== playAnim.id));
        clearLastEvent();
      }, reduce ? 300 : 520);

      timerRefs.current.push(timeout);
    }
  }, [lastEvent, clearLastEvent, isMobileViewport, lowEffects]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[70]">
      <AnimatePresence>
        {animations.map(anim => (
          <motion.div
            key={anim.id}
            initial={{
              x: anim.start.x,
              y: anim.start.y,
              scale: reduce ? 0.78 : 0.25,
              opacity: 0,
              rotate: anim.start.rotate,
            }}
            animate={{
              x: [anim.start.x, anim.end.x + anim.spreadX, anim.end.x],
              y: [anim.start.y, anim.end.y + anim.spreadY, anim.end.y],
              scale: anim.kind === 'play'
                ? [reduce ? 0.82 : 0.3, 1.05, anim.scaleTo]
                : [reduce ? 0.8 : 0.35, 1.02, anim.scaleTo],
              opacity: [0, 1, 1],
              rotate: anim.end.rotate + anim.rotationOffset,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              duration: anim.kind === 'play'
                ? (isMobileViewport ? 0.24 : reduce ? 0.28 : 0.72)
                : (isMobileViewport ? 0.34 : reduce ? 0.4 : 0.82),
              ease: reduce ? 'easeOut' : [0.24, 1.2, 0.34, 1],
              delay: anim.delay,
            }}
            className={clsx(
              'absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded border-2',
              anim.kind === 'play' ? 'w-12 h-16 border-yellow-100 bg-yellow-500/90' : 'w-11 h-[74px] border-white bg-red-600'
            )}
          >
            <div className="relative w-full h-full bg-slate-900 rounded-sm flex items-center justify-center overflow-hidden">
              <div
                className={clsx(
                  'absolute inset-0',
                  reduce
                    ? anim.kind === 'play'
                      ? 'opacity-35 bg-yellow-600/50'
                      : 'opacity-35 bg-red-700/40'
                    : anim.kind === 'play'
                      ? 'opacity-65 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-300 to-amber-700'
                      : 'opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500 to-black scale-150'
                )}
              />
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 7px)' }} />
              {!reduce && <div className="absolute inset-1 border border-white/25 rounded-sm" />}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FlyingCardLayer;
