
import React from 'react';
import { Commentary } from '../types';

interface StallOwnerProps {
  commentary: Commentary | null;
  loading: boolean;
}

const StallOwner: React.FC<StallOwnerProps> = ({ commentary, loading }) => {
  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'impressed': return '😎';
      case 'cheeky': return '😏';
      case 'disappointed': return '🤨';
      case 'happy': return '😊';
      default: return '👋';
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'impressed': return 'shadow-[0_0_20px_rgba(34,197,94,0.4)] border-green-500';
      case 'cheeky': return 'shadow-[0_0_20px_rgba(239,68,68,0.4)] border-red-500';
      case 'disappointed': return 'shadow-[0_0_20px_rgba(100,116,139,0.4)] border-slate-500';
      case 'happy': return 'shadow-[0_0_20px_rgba(234,179,8,0.4)] border-yellow-500';
      default: return 'border-red-500';
    }
  };

  return (
    <div className="fixed bottom-6 left-6 flex items-end gap-5 z-[120]">
      {/* Avatar Section */}
      <div className="relative shrink-0">
        <div className={`w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-4 flex items-center justify-center text-5xl transition-all duration-500 transform hover:scale-105 ${commentary ? getMoodColor(commentary.mood) : 'border-red-600 shadow-2xl'}`}>
          {commentary ? getMoodEmoji(commentary.mood) : '💥'}
        </div>
        
        {/* Warning Badge */}
        <div className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg animate-pulse">
          <i className="fas fa-exclamation-triangle text-white text-sm"></i>
        </div>
        
        {/* Stall Name Tag */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 px-2 py-0.5 rounded text-[10px] font-bungee text-white whitespace-nowrap shadow-md border border-red-400">
          JUNNEL DANGER
        </div>
      </div>
      
      {/* Speech Bubble Section */}
      <div className="max-w-sm mb-6">
        {loading ? (
          <div className="bg-slate-900/95 border-2 border-red-500/50 p-4 rounded-2xl rounded-bl-none text-base font-medium italic text-slate-300 animate-pulse shadow-2xl backdrop-blur-md">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
          </div>
        ) : commentary ? (
          <div className="bg-slate-900/95 border-2 border-red-500 p-5 rounded-2xl rounded-bl-none shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative animate-in fade-in slide-in-from-left-4 duration-500 backdrop-blur-md">
            <p className="text-white text-lg font-bold leading-tight drop-shadow-sm">
              "{commentary.text}"
            </p>
            {/* Speech Bubble Tail */}
            <div className="absolute -bottom-2 -left-[1px] w-6 h-6 bg-slate-900 border-l-2 border-b-2 border-red-500 transform -rotate-45 -translate-x-1/2 translate-y-1/2 rounded-sm"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StallOwner;
