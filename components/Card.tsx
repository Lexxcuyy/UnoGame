import React from 'react';
import { ICard } from '../types';
import { Ban, RotateCw, Layers, Ghost, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  card: ICard;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  isPlayable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isFaceDown?: boolean;
}

const Card: React.FC<CardProps> = ({ card, className = '', style, onClick, isPlayable = false, size = 'md', isFaceDown = false }) => {

  if (isFaceDown) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center select-none card-shadow rounded-xl bg-slate-900 border-2 border-slate-700",
          className
        )}
        style={{ ...style, width: size === 'lg' ? 96 : size === 'sm' ? 48 : 80, height: size === 'lg' ? 144 : size === 'sm' ? 64 : 128 }}
        onClick={onClick}
      >
        {/* Card Back Pattern */}
        <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-red-900 to-black overflow-hidden opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent" />
          <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-red-600 rounded-full transform rotate-45 flex items-center justify-center shadow-lg border-2 border-red-400">
              <span className="text-white font-black text-[10px] -rotate-45">UNO</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
      case 'yellow': return 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]';
      case 'green': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
      case 'blue': return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]';
      case 'black': return 'bg-slate-900 border-2 border-slate-600 shadow-[0_0_15px_rgba(0,0,0,0.8)]';
      case 'purple': return 'bg-purple-600 border-2 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.6)]';
      default: return 'bg-gray-800';
    }
  };

  const getTextColor = (color: string) => {
    if (color === 'yellow') return 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]'; // Better contrast
    return 'text-white';
  };

  // Content Renderer
  const renderContent = () => {
    if (card.type === 'number') {
      return (
        <span className={cn(
          "font-bold italic drop-shadow-md",
          size === 'lg' ? 'text-7xl' : 'text-5xl'
        )}>
          {card.value}
        </span>
      );
    }

    const iconSize = size === 'lg' ? 56 : 36;

    switch (card.type) {
      case 'skip': return <Ban size={iconSize} strokeWidth={3} className="drop-shadow-md" />;
      case 'reverse': return <RotateCw size={iconSize} strokeWidth={3} className="drop-shadow-md" />;
      case 'draw2':
        return (
          <div className="relative flex items-center justify-center">
            <span className="font-black text-5xl italic drop-shadow-md">+2</span>
          </div>
        );
      case 'wild':
        return (
          <div className="grid grid-cols-2 gap-1 w-full h-full p-4 transform rotate-45">
            <div className="bg-red-500 rounded-sm shadow-sm" />
            <div className="bg-blue-500 rounded-sm shadow-sm" />
            <div className="bg-yellow-400 rounded-sm shadow-sm" />
            <div className="bg-green-500 rounded-sm shadow-sm" />
          </div>
        );
      case 'wild4':
      case 'draw4':
        return (
          <div className="flex flex-col items-center justify-center">
            <div className="grid grid-cols-2 gap-0.5 w-10 h-10 transform rotate-12 mb-1">
              <div className="bg-red-500 rounded-[2px]" />
              <div className="bg-blue-500 rounded-[2px]" />
              <div className="bg-yellow-400 rounded-[2px]" />
              <div className="bg-green-500 rounded-[2px]" />
            </div>
            <span className="font-black text-3xl italic drop-shadow-md">+4</span>
          </div>
        );
      case 'draw10':
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 blur-xl rounded-full"></div>
            <span className="relative font-black text-5xl italic text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] border-text">+10</span>
          </div>
        );
      case 'draw6':
        return (
          <div className="relative flex items-center justify-center">
            <span className="font-black text-5xl italic text-purple-100 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">+6</span>
          </div>
        );
      case 'discardAll':
        return <Layers size={iconSize} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" />;
      case 'skipAll':
        return <Ghost size={iconSize} className="text-white/80 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse" />;
      default: return null;
    }
  };

  // Small corner label
  const renderCorner = () => {
    if (card.type === 'number') return card.value;
    if (card.type === 'skip') return <Ban size={16} />;
    if (card.type === 'reverse') return <RotateCw size={16} />;
    if (card.type === 'draw2') return '+2';
    if (card.type === 'draw4') return '+4';
    if (card.type === 'draw6') return '+6';
    if (card.type === 'draw10') return '+10';
    if (card.type === 'discardAll') return <Layers size={14} />;
    if (card.type === 'skipAll') return <Ghost size={14} />;
    return null;
  };

  const sizeClasses = {
    sm: 'w-12 h-16 rounded-md',
    md: 'w-24 h-36 rounded-xl',
    lg: 'w-32 h-48 rounded-2xl',
  };

  const isNoMercySpecial = ['draw10', 'draw6', 'discardAll', 'skipAll'].includes(card.type);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-300 transform-gpu",
        sizeClasses[size],
        getColorClass(card.color),
        "card-shadow hover:brightness-110",
        isPlayable && "cursor-pointer hover:-translate-y-8 hover:scale-110 hover:rotate-2 hover:shadow-2xl z-0 hover:z-[100]",
        isNoMercySpecial && "border-2 border-white/40", // Extra pop for special cards
        className
      )}
      style={style}
      onClick={onClick}
    >
      {/* Texture & Gloss */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/20 rounded-[inherit] pointer-events-none" />
      <div className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-br from-transparent to-black/10 pointer-events-none" />

      {/* Inner Ring (Classic Look) */}
      {!['wild', 'wild4', 'draw10', 'draw6'].includes(card.type) && (
        <div className="absolute inset-2.5 rounded-[inherit] bg-black/20 transform rotate-180 blur-[0.5px]" />
      )}

      {/* Content Container */}
      {!['wild', 'wild4'].includes(card.type) ? (
        <div className={cn(
          "relative w-[88%] h-[85%] border-white/90 border-2 rounded-[inherit] bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-inner",
          isNoMercySpecial && "border-red-500/50 bg-black/40" // Darker inner for dangerous cards
        )}>
          {/* Center Icon Glow */}
          <div className={cn(
            "absolute inset-0 opacity-30 filter blur-xl transform scale-150",
            getColorClass(card.color)
          )} />

          {/* Main Content */}
          <div className={cn("z-10", getTextColor(card.color))}>
            {renderContent()}
          </div>

          {/* Top Left Corner */}
          <div className="absolute top-1.5 left-2 text-white font-bold text-base drop-shadow-md">
            {renderCorner()}
          </div>

          {/* Bottom Right Corner (Rotated) */}
          <div className="absolute bottom-1.5 right-2 text-white font-bold text-base drop-shadow-md transform rotate-180">
            {renderCorner()}
          </div>
        </div>
      ) : (
        /* Wild Card Layout */
        <div className="relative w-[90%] h-[90%] flex items-center justify-center">
          {renderContent()}
          {/* Corner Wild Indicators */}
          <div className="absolute top-1 left-2 text-white font-bold text-xs drop-shadow-md">W</div>
          <div className="absolute bottom-1 right-2 text-white font-bold text-xs drop-shadow-md transform rotate-180">W</div>
        </div>
      )}

      {/* Shine Effect */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-300" />
    </div>
  );
};

export default Card;