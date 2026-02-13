import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardColor } from '../types';
import { clsx } from 'clsx';

interface ColorPickerModalProps {
    isOpen: boolean;
    onSelectColor: (color: CardColor) => void;
}

const colors: { value: CardColor; label: string; bg: string; border: string }[] = [
    { value: 'red', label: 'Red', bg: 'bg-red-500', border: 'border-red-400' },
    { value: 'blue', label: 'Blue', bg: 'bg-blue-500', border: 'border-blue-400' },
    { value: 'green', label: 'Green', bg: 'bg-green-500', border: 'border-green-400' },
    { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-400', border: 'border-yellow-200' },
];

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ isOpen, onSelectColor }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-slate-900/90 p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full"
                    >
                        <h2 className="text-2xl font-black text-white px-4 py-2 border-b-4 border-white/10">CHOOSE A COLOR</h2>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            {colors.map((c) => (
                                <motion.button
                                    key={c.value}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onSelectColor(c.value)}
                                    className={clsx(
                                        "h-24 rounded-2xl flex items-center justify-center text-xl font-bold uppercase text-white shadow-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all",
                                        c.bg,
                                        c.border
                                    )}
                                >
                                    {c.label}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ColorPickerModal;
