import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

const FlyingCardLayer: React.FC = () => {
    const { lastEvent, clearLastEvent } = useGameStore();

    // Track active animations
    const [animations, setAnimations] = useState<Array<{
        id: string;
        start: { x: string, y: string, rotate: number };
        end: { x: string, y: string, rotate: number };
        delay: number;
        rotationOffset: number;
    }>>([]);

    // Coordinate Mapping
    const getCoords = (pid: string) => {
        switch (pid) {
            case 'user': return { x: '50%', y: '90%', rotate: 0 };
            case 'bot1': return { x: '50%', y: '10%', rotate: 180 };
            case 'bot2': return { x: '10%', y: '50%', rotate: 90 };
            case 'bot3': return { x: '90%', y: '50%', rotate: -90 };
            default: return { x: '50%', y: '50%', rotate: 0 }; // Deck
        }
    };

    useEffect(() => {
        if (!lastEvent) return;

        if (lastEvent.type === 'draw' || lastEvent.type === 'stack') {
            const { playerId, count } = lastEvent;
            const start = getCoords('deck');
            const end = getCoords(playerId);

            const newAnims = Array.from({ length: Math.min(count, 15) }).map((_, i) => ({
                id: Math.random().toString(36),
                start,
                end,
                delay: i * 0.15, // 150ms Stagger
                rotationOffset: Math.random() * 180 - 90 // Random spin
            }));

            setAnimations(prev => [...prev, ...newAnims]);

            // Cleanup
            const maxDelay = newAnims.length * 0.15;
            setTimeout(() => {
                setAnimations(prev => prev.filter(p => !newAnims.find(n => n.id === p.id)));
                if (typeof clearLastEvent === 'function') clearLastEvent();
            }, 1000 + (maxDelay * 1000));
        }
    }, [lastEvent, clearLastEvent]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
            <AnimatePresence>
                {animations.map((anim) => (
                    <motion.div
                        key={anim.id}
                        initial={{
                            left: anim.start.x,
                            top: anim.start.y,
                            scale: 0.2,
                            opacity: 0,
                            rotate: anim.start.rotate
                        }}
                        animate={{
                            left: anim.end.x,
                            top: anim.end.y,
                            scale: 1,
                            opacity: 1,
                            rotate: anim.end.rotate + anim.rotationOffset
                        }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{
                            duration: 0.8,
                            ease: [0.34, 1.56, 0.64, 1], // Custom bouncy bezier
                            delay: anim.delay
                        }}
                        className="absolute w-12 h-16 bg-red-600 rounded shadow-lg border-2 border-white backface-hidden"
                        style={{ transform: 'translate(-50%, -50%)' }} // Start centered
                    >
                        {/* Card Back Design */}
                        <div className="w-full h-full bg-slate-900 rounded-sm flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600 to-black scale-150" />
                            <div className="absolute inset-1 border border-white/20 rounded-sm" />
                            <div className="absolute w-6 h-10 bg-red-600/20 rotate-45 blur-md" />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default FlyingCardLayer;
