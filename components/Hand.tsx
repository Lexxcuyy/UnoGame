import React from 'react';
import { ICard } from '../types';
import Card from './Card';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

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

    return (
        <div className="relative w-full flex justify-center items-end h-[180px] perspective-[1000px]">
            <LayoutGroup>
                <AnimatePresence>
                    {cards.map((card, index) => {
                        const { rotate, y } = getCardStyle(index, cards.length);
                        const isHovered = hoveredCardId === card.id;

                        return (
                            <motion.div
                                layout
                                key={card.id}
                                onMouseEnter={() => setHoveredCardId(card.id)}
                                onMouseLeave={() => setHoveredCardId(null)}
                                initial={{ opacity: 0, y: 100, rotate: 0 }}
                                animate={{
                                    opacity: 1,
                                    y: y,
                                    rotate: rotate,
                                    x: 0,
                                    zIndex: isHovered ? 100 : index, // Explicit Z-Index override
                                    transition: { type: 'spring', stiffness: 300, damping: 25 }
                                }}
                                exit={{ opacity: 0, y: -100, scale: 0.5, transition: { duration: 0.2 } }}
                                whileHover={{
                                    y: -40,
                                    scale: 1.15,
                                    rotate: 0,
                                    transition: { duration: 0.2 }
                                }}
                                className="relative -ml-8 first:ml-0 origin-bottom cursor-grab active:cursor-grabbing"
                                onClick={() => isCurrentTurn && onPlayCard(card.id)}
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
