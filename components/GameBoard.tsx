import React, { useState, useEffect } from 'react';
import { GameMode, ICard, Player } from '../types';
import Card from './Card';
import { ArrowLeft, MoreVertical, MessageCircle, Smile, Send, Clock, RefreshCw } from 'lucide-react';

interface GameBoardProps {
  mode: GameMode;
  onExit: () => void;
}

// Mock Data
const generateMockHand = (mode: GameMode): ICard[] => {
  if (mode === 'classic') {
    return [
      { id: '1', color: 'red', value: 6, type: 'number' },
      { id: '2', color: 'yellow', type: 'reverse' },
      { id: '3', color: 'green', type: 'draw2' },
      { id: '4', color: 'blue', value: 4, type: 'number' },
      { id: '5', color: 'blue', value: 5, type: 'number' },
      { id: '6', color: 'blue', type: 'skip' },
      { id: '7', color: 'black', type: 'wild' },
    ];
  } else {
    return [
      { id: '1', color: 'black', type: 'discardAll' }, // No Mercy special
      { id: '2', color: 'red', type: 'draw6' }, // No Mercy +6
      { id: '3', color: 'yellow', type: 'reverse' },
      { id: '4', color: 'purple', type: 'skipAll' }, // No Mercy Skip All
      { id: '5', color: 'black', type: 'draw10' }, // No Mercy +10
      { id: '6', color: 'blue', value: 7, type: 'number' },
    ];
  }
};

const OPPONENTS: Player[] = [
  { id: 'o1', name: 'MS2F_RI', avatar: 'https://picsum.photos/101/101', cardCount: 8, isBot: true, position: 'top' },
  { id: 'o2', name: '3l3ctr...', avatar: 'https://picsum.photos/102/102', cardCount: 5, isBot: true, position: 'left' },
  { id: 'o3', name: 'haziqs...', avatar: 'https://picsum.photos/103/103', cardCount: 12, isBot: true, position: 'right' },
];

const GameBoard: React.FC<GameBoardProps> = ({ mode, onExit }) => {
  const [hand, setHand] = useState<ICard[]>([]);
  const [topCard, setTopCard] = useState<ICard>({ id: 'top', color: mode === 'no-mercy' ? 'red' : 'yellow', value: 3, type: mode === 'no-mercy' ? 'draw10' : 'number' });
  const [direction, setDirection] = useState<'cw' | 'ccw'>('cw');

  useEffect(() => {
    setHand(generateMockHand(mode));
  }, [mode]);

  const isNoMercy = mode === 'no-mercy';
  const bgClass = isNoMercy ? 'bg-slate-950' : 'bg-slate-900';

  // Helper to calculate card position in hand (Arc)
  const getCardStyle = (index: number, total: number) => {
    const angleStep = 5; // Degrees between cards
    const startAngle = -((total - 1) * angleStep) / 2;
    const rotate = startAngle + index * angleStep;
    
    // Calculate vertical offset for arc effect
    const absRotate = Math.abs(rotate);
    const translateY = Math.abs(index - (total -1)/2) * 5; 

    return {
      transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
      zIndex: index,
    };
  };

  return (
    <div className={`relative w-full h-full flex flex-col ${bgClass} text-white`}>
      {/* Background Pattern */}
      <div className={`absolute inset-0 opacity-10 pointer-events-none ${isNoMercy ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black' : 'bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]'}`}></div>
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onExit} className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md">
          <ArrowLeft size={24} />
        </button>
        {isNoMercy && (
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">No Mercy Variant</span>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400">Stakes:</span>
              <span className="font-bold text-yellow-400">5,000</span>
            </div>
          </div>
        )}
        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md">
          <MoreVertical size={24} />
        </button>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative w-full max-w-lg mx-auto flex flex-col justify-center">
        
        {/* Opponents */}
        {OPPONENTS.map((opp) => (
          <div 
            key={opp.id} 
            className={`absolute flex flex-col items-center gap-2 transition-all duration-500
              ${opp.position === 'top' ? 'top-20 left-1/2 -translate-x-1/2' : ''}
              ${opp.position === 'left' ? 'left-4 top-1/3 -translate-y-1/2 items-start' : ''}
              ${opp.position === 'right' ? 'right-4 top-1/3 -translate-y-1/2 items-end' : ''}
            `}
          >
            <div className="relative group">
              <div className={`w-14 h-14 rounded-full p-0.5 ${opp.cardCount > 10 ? 'bg-red-500 animate-pulse' : 'bg-slate-700'} ring-2 ring-slate-800 shadow-lg`}>
                <img src={opp.avatar} alt={opp.name} className="w-full h-full rounded-full object-cover" />
              </div>
              <div className={`absolute -bottom-2 ${opp.position === 'left' ? '-right-2' : opp.position === 'right' ? '-left-2' : '-right-2'} 
                bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-slate-600 shadow-md min-w-[24px] text-center`}>
                {opp.cardCount}
              </div>
            </div>
            
            <div className={`flex flex-col ${opp.position === 'left' ? 'items-start' : opp.position === 'right' ? 'items-end' : 'items-center'}`}>
              <span className="text-xs font-semibold text-slate-300 drop-shadow-md">{opp.name}</span>
              {/* Mini Cards Display */}
              <div className={`flex -space-x-1.5 mt-1 opacity-70 scale-75 ${opp.position === 'left' ? 'origin-left' : opp.position === 'right' ? 'origin-right' : 'origin-center'}`}>
                {[...Array(Math.min(3, opp.cardCount))].map((_, i) => (
                  <div key={i} className="w-5 h-7 bg-slate-700 rounded-sm border border-slate-500 shadow-sm" />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Center Table (Deck & Discard) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-8 z-0">
          
          {/* Direction Indicator */}
          <div className="absolute w-[300px] h-[300px] pointer-events-none opacity-10">
             <RefreshCw size={300} className={`text-white transition-all duration-1000 ${direction === 'ccw' ? 'scale-x-[-1]' : ''} animate-[spin_10s_linear_infinite]`} />
          </div>

          {/* Draw Pile */}
          <div className="relative group cursor-pointer active:scale-95 transition-transform">
             <div className="absolute top-1 left-1 w-24 h-32 bg-slate-800 rounded-xl border border-white/10"></div>
             <div className="relative w-24 h-32 bg-gradient-to-br from-slate-800 to-black rounded-xl border-2 border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="w-20 h-28 border border-white/5 rounded-lg flex items-center justify-center">
                  <div className={`w-14 h-20 ${isNoMercy ? 'bg-purple-600' : 'bg-red-500'} rounded-full transform rotate-45 flex items-center justify-center shadow-inner`}>
                    <span className="text-white font-black text-xs -rotate-45">UNO</span>
                  </div>
                </div>
             </div>
          </div>

          {/* Discard Pile */}
          <div className="relative transform rotate-6 hover:rotate-0 transition-transform duration-300">
             <Card card={topCard} size="lg" className="shadow-2xl" />
          </div>
        </div>

      </div>

      {/* Bottom Player Section */}
      <div className="relative z-30 pb-safe">
        
        {/* Turn Indicator & Avatar */}
        <div className="flex flex-col items-center mb-2 z-20 pointer-events-none">
           <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500 p-0.5 bg-slate-900 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                 <img src="https://picsum.photos/104/104" alt="Me" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap flex flex-col items-center min-w-[80px]">
                <span className="uppercase tracking-wider">Your Turn</span>
                <div className="w-full h-1 bg-blue-800 rounded-full mt-0.5 overflow-hidden">
                   <div className="h-full bg-yellow-400 w-2/3 animate-[pulse_1s_ease-in-out_infinite]"></div>
                </div>
              </div>
              <div className="absolute top-0 right-0 bg-slate-800 rounded-full p-1 border border-slate-600">
                 <Clock size={12} className="text-yellow-400" />
              </div>
           </div>
        </div>

        {/* Player Controls (Chat/Uno Button) */}
        <div className="flex items-center justify-between px-4 mb-2 pointer-events-auto">
           <button className={`flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/10 shadow-lg active:scale-95 transition-transform
             ${isNoMercy ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-slate-800'}`}>
              <span className="font-bold text-xs uppercase text-white">Uno!</span>
           </button>
           
           <div className="flex items-center gap-2">
             <div className="bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/5 flex items-center gap-2 w-48">
               <input type="text" placeholder="Chat..." className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-500 w-full" />
               <Send size={14} className="text-gray-400" />
             </div>
             <button className="p-2 bg-slate-800 rounded-full border border-white/10 text-gray-400 hover:text-white">
               <Smile size={20} />
             </button>
           </div>
        </div>

        {/* Player Hand (The Fan) */}
        <div className="h-40 w-full overflow-visible flex justify-center items-end pb-6 pointer-events-auto px-4">
           <div className="relative w-full max-w-md h-32 flex justify-center items-end">
              {hand.map((card, index) => (
                <div 
                  key={card.id}
                  className="absolute origin-bottom transition-all duration-300 hover:z-50 hover:!-translate-y-6"
                  style={{
                    ...getCardStyle(index, hand.length),
                    left: `calc(50% + ${(index - (hand.length - 1) / 2) * 35}px)`, // Horizontal spacing overlap
                    bottom: 0,
                  }}
                >
                  <Card card={card} isPlayable={true} />
                </div>
              ))}
           </div>
        </div>
      </div>

    </div>
  );
};

export default GameBoard;