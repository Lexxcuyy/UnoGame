import React from 'react';
import { ICard } from '../types';
import { Ban, RotateCw, Layers, Ghost } from 'lucide-react';
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
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isFaceDown?: boolean;
  lowEffects?: boolean;
}

const Card: React.FC<CardProps> = ({
  card,
  className = '',
  style,
  onClick,
  isPlayable = false,
  size = 'md',
  isFaceDown = false,
  lowEffects = false,
}) => {
  if (isFaceDown) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center select-none rounded-xl bg-slate-900 border-2 border-slate-700',
          !lowEffects && 'card-shadow',
          className
        )}
        style={{
          ...style,
          width: size === 'lg' ? 96 : size === 'md' ? 80 : size === 'sm' ? 64 : 48,
          height: size === 'lg' ? 144 : size === 'md' ? 128 : size === 'sm' ? 96 : 72,
        }}
        onClick={onClick}
      >
        <div className={cn('absolute inset-1 rounded-lg overflow-hidden', lowEffects ? 'bg-red-900/30' : 'bg-gradient-to-br from-red-900 to-black')}>
          {!lowEffects && (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent" />
              <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)' }} />
            </>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('rounded-full transform rotate-45 flex items-center justify-center border-2', size === 'xs' ? 'w-8 h-8' : 'w-10 h-10', lowEffects ? 'bg-red-600 border-red-500' : 'bg-red-600 shadow-lg border-red-400')}>
              <span className={cn('text-white font-black -rotate-45', size === 'xs' ? 'text-[7px]' : 'text-[8px]')}>UNO</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getColorClass = (color: string) => {
    if (lowEffects) {
      switch (color) {
        case 'red':
          return 'bg-red-500';
        case 'yellow':
          return 'bg-yellow-400';
        case 'green':
          return 'bg-green-500';
        case 'blue':
          return 'bg-blue-500';
        case 'black':
          return 'bg-slate-900 border-2 border-slate-600';
        case 'purple':
          return 'bg-purple-600 border-2 border-purple-400';
        default:
          return 'bg-gray-800';
      }
    }

    switch (color) {
      case 'red':
        return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
      case 'yellow':
        return 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]';
      case 'green':
        return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
      case 'blue':
        return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]';
      case 'black':
        return 'bg-slate-900 border-2 border-slate-600 shadow-[0_0_15px_rgba(0,0,0,0.8)]';
      case 'purple':
        return 'bg-purple-600 border-2 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.6)]';
      default:
        return 'bg-gray-800';
    }
  };

  const getTextColor = (color: string) => {
    if (color === 'yellow') return 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]';
    return 'text-white';
  };

  const renderContent = () => {
    if (card.type === 'number') {
      return <span className={cn('font-bold italic drop-shadow-md', size === 'lg' ? 'text-7xl' : 'text-5xl')}>{card.value}</span>;
    }

    const iconSize = size === 'lg' ? 56 : size === 'sm' ? 36 : 28;
    const plusTextClass = size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-4xl' : size === 'sm' ? 'text-3xl' : 'text-2xl';
    const plusTextShadow = lowEffects ? '' : 'drop-shadow-md';

    switch (card.type) {
      case 'skip':
        return <Ban size={iconSize} strokeWidth={3} className="drop-shadow-md" />;
      case 'reverse':
        return <RotateCw size={iconSize} strokeWidth={3} className="drop-shadow-md" />;
      case 'draw2':
        return (
          <div className="relative flex items-center justify-center">
            <span className={cn('font-black italic leading-none', plusTextClass, plusTextShadow)}>+2</span>
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
            <div
              className={cn(
                'grid grid-cols-2 gap-0.5 transform rotate-12',
                size === 'lg' ? 'w-11 h-11 mb-1' : size === 'md' ? 'w-10 h-10 mb-1' : 'w-8 h-8 mb-0.5'
              )}
            >
              <div className="bg-red-500 rounded-[2px]" />
              <div className="bg-blue-500 rounded-[2px]" />
              <div className="bg-yellow-400 rounded-[2px]" />
              <div className="bg-green-500 rounded-[2px]" />
            </div>
            <span className={cn('font-black italic leading-none', size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl', plusTextShadow)}>+4</span>
          </div>
        );
      case 'draw10':
        return (
          <div className="relative flex items-center justify-center">
            <span className={cn('font-black italic leading-none', plusTextClass, lowEffects ? 'text-red-500' : 'text-red-500 drop-shadow-[0_0_8px_rgba(255,0,0,0.75)]')}>+10</span>
          </div>
        );
      case 'draw6':
        return (
          <div className="relative flex items-center justify-center">
            <span className={cn('font-black italic leading-none', plusTextClass, lowEffects ? 'text-purple-100' : 'text-purple-100 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]')}>+6</span>
          </div>
        );
      case 'x2':
        return (
          <div className="relative flex items-center justify-center">
            <span className={cn('font-black italic leading-none', plusTextClass, lowEffects ? 'text-white' : 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]')}>x2</span>
          </div>
        );
      case 'discardAll':
        return <Layers size={iconSize} className={cn('text-white', !lowEffects && 'drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]')} />;
      case 'skipAll':
        return <Ghost size={iconSize} className={cn('text-white/80', !lowEffects && 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse')} />;
      default:
        return null;
    }
  };

  const renderCorner = () => {
    if (card.type === 'number') return card.value;
    if (card.type === 'skip') return <Ban size={16} />;
    if (card.type === 'reverse') return <RotateCw size={16} />;
    if (card.type === 'draw2') return '+2';
    if (card.type === 'draw4') return '+4';
    if (card.type === 'draw6') return '+6';
    if (card.type === 'draw10') return '+10';
    if (card.type === 'x2') return 'x2';
    if (card.type === 'discardAll') return <Layers size={14} />;
    if (card.type === 'skipAll') return <Ghost size={14} />;
    return null;
  };

  const sizeClasses = {
    xs: 'w-12 h-[72px] rounded-lg',
    sm: 'w-16 h-24 rounded-lg',
    md: 'w-24 h-36 rounded-xl',
    lg: 'w-32 h-48 rounded-2xl',
  };

  const isNoMercySpecial = ['draw10', 'draw6', 'discardAll', 'skipAll', 'x2'].includes(card.type);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center select-none transform-gpu',
        lowEffects ? 'transition-transform duration-150' : 'transition-all duration-300',
        sizeClasses[size],
        getColorClass(card.color),
        !lowEffects && 'card-shadow hover:brightness-110',
        isPlayable && !lowEffects && 'cursor-pointer hover:-translate-y-8 hover:scale-110 hover:rotate-2 hover:shadow-2xl z-0 hover:z-[100]',
        isPlayable && lowEffects && 'cursor-pointer active:scale-[0.98]',
        isNoMercySpecial && 'border-2 border-white/40',
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className={cn('absolute inset-0 rounded-[inherit] pointer-events-none', lowEffects ? 'bg-gradient-to-br from-white/20 via-transparent to-black/10' : 'bg-gradient-to-br from-white/40 via-transparent to-black/20')} />
      <div className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-br from-transparent to-black/10 pointer-events-none" />

      {!['wild', 'wild4', 'draw10', 'draw6', 'x2'].includes(card.type) && !lowEffects && <div className="absolute inset-2.5 rounded-[inherit] bg-black/20 transform rotate-180 blur-[0.5px]" />}

      {!['wild', 'wild4'].includes(card.type) ? (
        <div
          className={cn(
            'relative w-[88%] h-[85%] border-white/90 border-2 rounded-[inherit] flex items-center justify-center overflow-hidden shadow-inner',
            lowEffects ? 'bg-white/5' : 'bg-white/10 backdrop-blur-sm',
            isNoMercySpecial && 'border-red-500/50 bg-black/40'
          )}
        >
          {!lowEffects && <div className={cn('absolute inset-0 opacity-30 filter blur-xl transform scale-150', getColorClass(card.color))} />}

          <div className={cn('z-10', getTextColor(card.color))}>{renderContent()}</div>

          <div className="absolute top-1.5 left-2 text-white font-bold text-base drop-shadow-md">{renderCorner()}</div>
          <div className="absolute bottom-1.5 right-2 text-white font-bold text-base drop-shadow-md transform rotate-180">{renderCorner()}</div>
        </div>
      ) : (
        <div className="relative w-[90%] h-[90%] flex items-center justify-center">
          {renderContent()}
          <div className="absolute top-1 left-2 text-white font-bold text-xs drop-shadow-md">W</div>
          <div className="absolute bottom-1 right-2 text-white font-bold text-xs drop-shadow-md transform rotate-180">W</div>
        </div>
      )}

      {!lowEffects && <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-300" />}
    </div>
  );
};

export default Card;
