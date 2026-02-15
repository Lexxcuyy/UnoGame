import React from 'react';
import { GameMode } from '../types';
import { User, Settings, Zap, Users, Trophy, MessageSquare, ShoppingBag, Home } from 'lucide-react';

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void;
  onOpenFriends: () => void;
  profileName: string;
  onProfileNameChange: (name: string) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onOpenFriends, profileName, onProfileNameChange }) => {
  return (
    <div className="relative h-full w-full flex flex-col bg-slate-900">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      {/* Header */}
      <header className="relative z-10 pt-12 px-6 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3 bg-slate-800/80 backdrop-blur-md p-2 rounded-full pr-6 border border-white/5 shadow-lg">
          <div className="relative">
            <img
              src="https://picsum.photos/100/100"
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-white/20"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
          </div>
          <div>
            <input
              value={profileName}
              onChange={e => onProfileNameChange(e.target.value)}
              maxLength={24}
              className="text-sm font-bold text-white bg-transparent outline-none w-[120px]"
            />
            <div className="text-xs text-yellow-400 font-bold flex items-center gap-1">
              <span>$</span> 2,450
            </div>
          </div>
        </div>
        
        <button className="p-3 bg-slate-800/80 backdrop-blur-md rounded-full border border-white/5 shadow-lg active:scale-95 transition-transform">
          <Settings size={20} className="text-slate-300" />
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 py-4 flex flex-col gap-6 overflow-y-auto no-scrollbar">
        <div className="text-center py-4">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Let's Play!</h1>
          <p className="text-slate-400 text-sm">Select your challenge</p>
        </div>

        {/* Game Modes */}
        <div className="flex flex-col gap-5">
          {/* Classic Mode */}
          <button 
            onClick={() => onStartGame('classic')}
            className="group relative w-full h-44 rounded-3xl overflow-hidden shadow-lg active:scale-95 transition-all duration-300 hover:shadow-orange-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 transition-transform duration-500 group-hover:scale-110"></div>
            <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
            
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider">
              Popular
            </div>

            <div className="relative z-10 h-full flex flex-col justify-center items-start px-8">
              <div className="mb-4 transform group-hover:-rotate-12 transition-transform duration-300">
                <div className="w-12 h-16 bg-white rounded-lg shadow-xl flex items-center justify-center border-2 border-orange-200">
                  <div className="w-10 h-14 bg-red-500 rounded flex items-center justify-center">
                    <span className="font-bold text-white text-2xl">1</span>
                  </div>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white drop-shadow-md">Classic</h3>
              <p className="text-orange-100 text-sm font-medium mt-1">Original rules, endless fun</p>
            </div>
          </button>

          {/* No Mercy Mode */}
          <button 
             onClick={() => onStartGame('no-mercy')}
             className="group relative w-full h-44 rounded-3xl overflow-hidden shadow-lg active:scale-95 transition-all duration-300 hover:shadow-purple-500/30 ring-2 ring-transparent hover:ring-purple-500/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-900"></div>
            {/* Striped Pattern */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}></div>
            
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg animate-pulse">
              Hardcore
            </div>

            <div className="relative z-10 h-full flex flex-col justify-center items-start px-8">
              <div className="flex -space-x-4 mb-4 group-hover:space-x-1 transition-all duration-300">
                <div className="w-10 h-14 bg-white rounded shadow-lg flex items-center justify-center transform -rotate-12 border-2 border-slate-900 z-10">
                   <span className="text-red-600 font-black text-xs">+10</span>
                </div>
                <div className="w-10 h-14 bg-black rounded shadow-lg flex items-center justify-center transform rotate-6 border-2 border-red-500 z-20">
                   <span className="text-red-500 font-black text-xs">x2</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white drop-shadow-md">No Mercy</h3>
              <p className="text-purple-200 text-sm font-medium mt-1">Prepare to lose friends</p>
            </div>
          </button>
        </div>

        {/* Secondary Options */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <button
            onClick={onOpenFriends}
            className="bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition-colors border border-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
              <Users size={20} />
            </div>
            <span className="font-bold text-sm text-slate-200">With Friends</span>
          </button>
          <button className="bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition-colors border border-white/5">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
              <Zap size={20} />
            </div>
            <span className="font-bold text-sm text-slate-200">Quick Match</span>
          </button>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="relative z-20 px-6 pb-8 pt-2">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex justify-around items-center shadow-2xl">
          <button className="p-3 text-white bg-white/10 rounded-xl transition-all">
            <Home size={24} />
          </button>
          <button className="p-3 text-slate-500 hover:text-white transition-colors">
            <Trophy size={24} />
          </button>
          <button className="p-3 relative text-slate-500 hover:text-white transition-colors">
            <MessageSquare size={24} />
            <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border border-slate-800"></span>
          </button>
          <button className="p-3 text-slate-500 hover:text-white transition-colors">
            <ShoppingBag size={24} />
          </button>
        </div>
        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            12,402 Players Online
          </div>
        </div>
      </nav>
    </div>
  );
};

export default MainMenu;
