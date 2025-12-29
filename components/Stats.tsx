
import React from 'react';

interface StatsProps {
  score: number;
  ammo: number;
  lives: number;
  level: number;
  streak: number;
  hasTeddy: boolean;
}

const Stats: React.FC<StatsProps> = ({ score, ammo, lives, level, streak, hasTeddy }) => {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-4 md:gap-6 z-40 w-full px-4">
      {/* Lives Section */}
      <div className="bg-slate-900/80 border-2 border-red-500 px-4 py-2 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-sm">
        <span className="text-red-400 font-bungee text-xs tracking-widest uppercase">Health</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <i 
              key={i} 
              className={`fas fa-heart text-lg transition-all duration-500 ${
                i < lives 
                  ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' 
                  : 'text-slate-800'
              } ${lives === 1 && i < lives ? 'animate-pulse scale-125' : ''}`}
            ></i>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/80 border-2 border-emerald-500 px-6 py-2 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.3)] backdrop-blur-sm">
        <span className="text-emerald-400 font-bungee text-xs tracking-widest uppercase">Score</span>
        <div className="flex items-center gap-2">
           <span className="text-2xl font-bungee text-white">{score}</span>
           {hasTeddy && (
             <div className="flex items-center justify-center w-8 h-8 bg-pink-500 rounded-full animate-bounce shadow-[0_0_10px_rgba(236,72,153,1)]">
               <i className="fas fa-bear-paw text-white text-xs" title="Big Teddy Prize!"></i>
             </div>
           )}
        </div>
      </div>
      
      <div className="bg-slate-900/80 border-2 border-cyan-400 px-6 py-2 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(34,211,238,0.3)] backdrop-blur-sm">
        <span className="text-cyan-400 font-bungee text-xs tracking-widest uppercase">Ammo</span>
        <div className="flex gap-1 items-center">
          {Array.from({ length: Math.min(ammo, 8) }).map((_, i) => (
            <div key={i} className="w-1.5 h-4 bg-yellow-400 rounded-sm shadow-[0_0_5px_rgba(250,204,21,0.5)]"></div>
          ))}
          {ammo > 8 && <span className="text-white ml-2 font-bungee">+{ammo - 8}</span>}
          {ammo === 0 && <span className="text-red-500 font-bungee text-xs animate-pulse">EMPTY</span>}
        </div>
      </div>

      <div className="bg-slate-900/80 border-2 border-yellow-400 px-6 py-2 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(250,204,21,0.3)] backdrop-blur-sm">
        <span className="text-yellow-400 font-bungee text-xs tracking-widest uppercase text-center">Streak</span>
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bungee text-white">{streak}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i <= streak ? 'bg-yellow-400 shadow-[0_0_8px_#fbbf24] scale-110' : 'bg-slate-700'}`}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
