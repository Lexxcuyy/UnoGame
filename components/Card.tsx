import React from 'react';
import { ICard } from '../types';
import { Ban, RotateCw, Layers, Ghost, Plus } from 'lucide-react';

interface CardProps {
  card: ICard;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  isPlayable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ card, className = '', style, onClick, isPlayable = false, size = 'md' }) => {
  
  const getColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'bg-uno-red';
      case 'yellow': return 'bg-uno-yellow';
      case 'green': return 'bg-uno-green';
      case 'blue': return 'bg-uno-blue';
      case 'black': return 'bg-black border-2 border-gray-700';
      case 'purple': return 'bg-mercy-accent border-2 border-purple-400';
      default: return 'bg-gray-800';
    }
  };

  const getTextColor = (color: string) => {
    if (color === 'yellow') return 'text-white drop-shadow-md'; // Adjust readability
    return 'text-white';
  };

  // Content Renderer
  const renderContent = () => {
    if (card.type === 'number') {
      return (
        <span className={`font-bold italic drop-shadow-md ${size === 'lg' ? 'text-6xl' : 'text-4xl'}`}>
          {card.value}
        </span>
      );
    }

    const iconSize = size === 'lg' ? 48 : 32;

    switch (card.type) {
      case 'skip': return <Ban size={iconSize} strokeWidth={3} />;
      case 'reverse': return <RotateCw size={iconSize} strokeWidth={3} />;
      case 'draw2': 
        return (
          <div className="relative">
             <span className="font-bold text-4xl italic">+2</span>
             <div className="absolute top-0 right-0 animate-ping opacity-20 bg-white rounded-full w-full h-full"></div>
          </div>
        );
      case 'wild': 
        return (
          <div className="grid grid-cols-2 gap-1 w-full h-full p-4 transform rotate-45">
            <div className="bg-uno-red rounded-sm" />
            <div className="bg-uno-blue rounded-sm" />
            <div className="bg-uno-yellow rounded-sm" />
            <div className="bg-uno-green rounded-sm" />
          </div>
        );
      case 'wild4': 
      case 'draw4':
        return (
           <div className="flex flex-col items-center justify-center">
             <div className="grid grid-cols-2 gap-0.5 w-8 h-8 transform rotate-12 mb-1">
                <div className="bg-uno-red rounded-xs" />
                <div className="bg-uno-blue rounded-xs" />
                <div className="bg-uno-yellow rounded-xs" />
                <div className="bg-uno-green rounded-xs" />
             </div>
             <span className="font-black text-2xl italic">+4</span>
           </div>
        );
      case 'draw10':
        return <span className="font-black text-5xl italic text-red-500 drop-shadow-lg filter">+10</span>;
      case 'draw6':
        return <span className="font-black text-5xl italic text-red-500 drop-shadow-lg">+6</span>;
      case 'discardAll':
        return <Layers size={iconSize} />;
      case 'skipAll':
        return <Ghost size={iconSize} />;
      default: return null;
    }
  };

  // Small corner label
  const renderCorner = () => {
    if (card.type === 'number') return card.value;
    if (card.type === 'skip') return <Ban size={14} />;
    if (card.type === 'reverse') return <RotateCw size={14} />;
    if (card.type === 'draw2') return '+2';
    if (card.type === 'draw4') return '+4';
    if (card.type === 'draw6') return '+6';
    if (card.type === 'draw10') return '+10';
    if (card.type === 'discardAll') return 'DA';
    return null;
  };

  const sizeClasses = size === 'lg' ? 'w-24 h-36 rounded-xl' : size === 'sm' ? 'w-10 h-14 rounded-md' : 'w-20 h-32 rounded-lg';

  return (
    <div 
      className={`
        relative ${sizeClasses} 
        ${getColorClass(card.color)} 
        card-shadow select-none
        flex items-center justify-center
        transition-all duration-200
        ${isPlayable ? 'hover:-translate-y-6 hover:scale-105 cursor-pointer ring-2 ring-white/50' : ''}
        ${className}
      `}
      style={style}
      onClick={onClick}
    >
      {/* Background Texture (Plastic look) */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-black/10 rounded-[inherit] pointer-events-none" />
      
      {/* Inner White Oval (Classic Look) */}
      {card.color !== 'black' && card.type !== 'wild' && (
        <div className="absolute inset-2 rounded-[inherit] bg-black/20 transform rotate-180 blur-[1px]" />
      )}
      
      {/* Content Container */}
      {card.type !== 'wild' && card.type !== 'wild4' && card.type !== 'draw10' ? (
         <div className="relative w-[85%] h-[80%] border-white border-2 rounded-[inherit] bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-inner">
           {/* Center Icon Background */}
           <div className={`absolute inset-0 opacity-20 ${getColorClass(card.color)} filter blur-md transform scale-150`} />
           
           {/* Main Content */}
           <div className={`z-10 ${getTextColor(card.color)}`}>
             {renderContent()}
           </div>

           {/* Top Left Corner */}
           <div className="absolute top-1 left-1.5 text-white font-bold text-sm drop-shadow-md">
             {renderCorner()}
           </div>
           
           {/* Bottom Right Corner (Rotated) */}
           <div className="absolute bottom-1 right-1.5 text-white font-bold text-sm drop-shadow-md transform rotate-180">
             {renderCorner()}
           </div>
         </div>
      ) : (
        /* Wild Card Layout */
        <div className="relative w-[90%] h-[90%] flex items-center justify-center">
            {renderContent()}
        </div>
      )}
    </div>
  );
};

export default Card;