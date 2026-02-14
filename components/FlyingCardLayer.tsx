import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

const FlyingCardLayer: React.FC = () => {
    const { lastEvent, clearLastEvent, players } = useGameStore();

    // Track active animations
    // Each requires a unique ID and coords
    const [animations, setAnimations] = useState<Array<{
        id: string;
        start: { x: number | string, y: number | string, rotate: number };
        end: { x: number | string, y: number | string, rotate: number };
        delay: number;
    }>>([]);

    // Coordinate Mapping (Approximate for now, effectively "hardcoded" to the layout)
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

            const newAnims = Array.from({ length: Math.min(count, 10) }).map((_, i) => ({
                id: Math.random().toString(36),
                start,
                end,
                delay: i * 0.1
            }));

            setAnimations(prev => [...prev, ...newAnims]);

            // Cleanup
            setTimeout(() => {
                setAnimations(prev => prev.filter(p => !newAnims.find(n => n.id === p.id)));
                if (typeof clearLastEvent === 'function') clearLastEvent();
            }, 2000);
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
                            rotate: anim.end.rotate
                        }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.8, delay: anim.delay }}
                        className="absolute w-12 h-16 bg-red-600 rounded shadow-lg border-2 border-white"
                        style={{ transform: 'translate(-50%, -50%)' }}
                    >
                        <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-900 rounded-sm" />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default FlyingCardLayer;
