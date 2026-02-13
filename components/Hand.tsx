import React from 'react';
import { ICard } from '../types';
import Card from './Card';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { clsx } from 'clsx';
import { useGameStore } from '../store/gameStore';

interface HandProps {
    cards: ICard[];
    onPlayCard: (cardId: string) => void;
    isCurrentTurn: boolean;
}

const Hand: React.FC<HandProps> = ({ cards, onPlayCard, isCurrentTurn }) => {
    const [hoveredCardId, setHoveredCardId] = React.useState<string | null>(null);

    // Calculate fan curve
    const getCardStyle = (index: number, total: number) => {
        if (total === 1) return { rotate: 0, y: 0 };

        // Max rotation spread (degrees)
        const maxRotation = 60;
        const angleStep = Math.min(maxRotation / (total - 1), 10); // Cap step size

        const startAngle = -((total - 1) * angleStep) / 2;
        const rotate = startAngle + index * angleStep;

        // Arch effect (Y-axis)
        const absDistance = Math.abs(index - (total - 1) / 2);
        const y = Math.pow(absDistance, 2) * 2;

        return { rotate, y };
    };

    // --- Playability Logic ---
    const gameState = useGameStore();

    const isPlayable = (card: ICard) => {
        if (!isCurrentTurn) return false;

        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        const { stackAccumulation, gameMode, activeColor } = gameState;

        // 1. Stacking Rule (Priority)
        if (stackAccumulation > 0) {
            if (card.type === 'draw2') {
                // Classic: can stack +2 on +2
                // No Mercy: +2 on +2, +4, +6, +10 logic handled in store but simplified here for UI
                // For UI, if it's a draw card, it MIGHT be playable.
                // Let's replicate store logic exactly for accuracy.
                if (gameMode === 'classic') return true;
                // No Mercy simple check (power >= power) logic is complex to duplicate fully without helper.
                // Simplified: If it's a draw card, highlight it. The store will validate specific power.
                return true;
            }
            if (gameMode === 'no-mercy') {
                if (['draw4', 'draw6', 'draw10'].includes(card.type)) return true;
            }
            return false;
        }

        // 2. Normal Rule
        if (card.color === activeColor || card.color === 'black' || activeColor === 'black') return true;
        if (card.type === topCard.type || (card.type === 'number' && card.value === topCard.value)) return true;

        return false;
    };

    return (
        <div className="relative w-full flex justify-center items-end h-[180px] perspective-[1000px]">
            <LayoutGroup>
                <AnimatePresence>
                    {cards.map((card, index) => {
                        const { rotate, y } = getCardStyle(index, cards.length);
                        const isHovered = hoveredCardId === card.id;
                        const playable = isPlayable(card);

                        return (
                            <motion.div
                                layout
                                key={card.id}
                                onMouseEnter={() => setHoveredCardId(card.id)}
                                onMouseLeave={() => setHoveredCardId(null)}
                                initial={{ opacity: 0, y: 100, rotate: 0 }}
                                animate={{
                                    opacity: 1,
                                    y: playable ? y - 30 : y, // Default pop up if playable
                                    rotate: rotate,
                                    x: 0,
                                    filter: playable ? 'brightness(1)' : 'brightness(0.5) grayscale(0.2)', // Dim unplayable
                                    zIndex: isHovered ? 100 : index,
                                    transition: { type: 'spring', stiffness: 300, damping: 25 }
                                }}
                                exit={{ opacity: 0, y: -100, scale: 0.5, transition: { duration: 0.2 } }}
                                whileHover={playable ? {
                                    y: -60, // Go even higher on hover
                                    scale: 1.15,
                                    rotate: 0,
                                    transition: { duration: 0.2 }
                                } : {}}
                                className={clsx(
                                    "relative -ml-8 first:ml-0 origin-bottom transition-all duration-200",
                                    playable ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-80"
                                )}
                                onClick={() => isCurrentTurn && playable && onPlayCard(card.id)}
                            >
                                <Card
                                    card={card}
                                    isPlayable={isCurrentTurn}
                                    className={!isCurrentTurn ? "brightness-75 grayscale-[0.3]" : ""}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </LayoutGroup>
        </div>
    );
};

export default Hand;
