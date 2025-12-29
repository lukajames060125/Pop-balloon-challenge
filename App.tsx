
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Balloon, GameState, Commentary, BalloonType, WeaponType } from './types';
import { getStallOwnerCommentary, getIntroMessage } from './services/geminiService';
import StallOwner from './components/StallOwner';
import Stats from './components/Stats';

const BALLOON_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#d946ef', '#f97316', '#a855f7'];
const ROWS = 6;
const COLS = 10;
const INITIAL_AMMO = 5; 
const INITIAL_LIVES = 5;
const COMMENTARY_COOLDOWN = 5000; 

// Audio URLs
const BG_MUSIC_URL = 'https://assets.mixkit.co/music/preview/mixkit-carnival-parade-loop-544.mp3';
const SHOT_SFX_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-laser-gun-shot-3110.mp3';
const POP_SFX_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-balloon-pop-vibe-3067.mp3';
const EXPLOSION_SFX_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-truck-explosion-1691.mp3';

const LOCAL_WITS: string[] = [
  "That's just the Junnel Tax, baby! FAT POCKETS!",
  "I love the smell of desperation in the morning!",
  "Loser Energy detected! Initiating laughter...",
  "Hurry up! Time is money and you're wasting MINE!",
  "WAHHHH! Did Junnel Danger hurt your feelings?"
];

interface PopEffect {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    playerName: '',
    score: 0,
    ammo: INITIAL_AMMO,
    lives: INITIAL_LIVES,
    level: 1,
    status: 'start',
    streak: 0,
    hasTeddy: false,
    hasConsolation: false,
    hasMiniPrize: false,
    weapon: 'rifle'
  });
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [deathCause, setDeathCause] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFiring, setIsFiring] = useState(false);
  const [showPrizeOverlay, setShowPrizeOverlay] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nameInput, setNameInput] = useState('');
  
  const lastCommentaryTime = useRef<number>(0);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Audio Context and Background Music
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }

    bgAudioRef.current = new Audio(BG_MUSIC_URL);
    bgAudioRef.current.loop = true;
    bgAudioRef.current.volume = 0.3;

    const unlockAudio = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      tryStartMusic();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const playSFX = (url: string, volume: number = 0.5) => {
    if (isMuted) return;
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(() => {});
  };

  const tryStartMusic = () => {
    if (bgAudioRef.current && bgAudioRef.current.paused) {
      bgAudioRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const initLevel = useCallback((level: number) => {
    const newBalloons: Balloon[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const rand = Math.random();
        let type: BalloonType = 'normal';
        let points = 1;
        const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        if (rand < 0.30) {
          type = 'hazard';
          points = 0;
        } else {
          type = 'normal';
          points = 1;
        }
        newBalloons.push({
          id: `b-${r}-${c}`,
          type,
          color,
          points,
          popped: false,
          x: c,
          y: r
        });
      }
    }
    setBalloons(newBalloons);
  }, []);

  useEffect(() => {
    if (gameState.status === 'playing') {
      initLevel(gameState.level);
    }
  }, [gameState.status, gameState.level, initLevel]);

  useEffect(() => {
    if (gameState.playerName) {
      const fetchIntro = async () => {
        setLoadingCommentary(true);
        const text = await getIntroMessage(gameState.playerName);
        setCommentary({ text, mood: 'happy' });
        setLoadingCommentary(false);
        lastCommentaryTime.current = Date.now();
      };
      fetchIntro();
    }
  }, [gameState.playerName]);

  const triggerFireEffects = () => {
    tryStartMusic();
    playSFX(SHOT_SFX_URL, 0.4);
    setIsShaking(true);
    setIsFlashing(true);
    setIsFiring(true);
    setTimeout(() => {
      setIsShaking(false);
      setIsFlashing(false);
      setIsFiring(false);
    }, 80);
  };

  const addEffect = (text: string, x: number, y: number, color: string, duration = 1200) => {
    const newEffect: PopEffect = {
      id: Math.random().toString(),
      text,
      x,
      y,
      color
    };
    setPopEffects(prev => [...prev, newEffect]);
    setTimeout(() => {
      setPopEffects(prev => prev.filter(ef => ef.id !== newEffect.id));
    }, duration);
  };

  const popBalloonInternal = (balloon: Balloon, clientX: number, clientY: number) => {
    let effectText = `+${balloon.points}`;
    let effectColor = 'text-white';
    let endLevel = false;

    if (balloon.type === 'hazard') {
      playSFX(EXPLOSION_SFX_URL, 0.6);
      const newLives = gameState.lives - 1;
      effectText = "💔 -1 LIFE";
      effectColor = "text-red-600 font-bold scale-150";
      
      if (newLives <= 0) {
        setDeathCause(`THE CHAMP IS GONE! You finally paid the full Junnel Tax, ${gameState.playerName}.`);
        setGameState(prev => ({ ...prev, lives: 0, status: 'gameover', streak: 0 }));
        updateCommentary(`${gameState.playerName} hit a final boom and lost their last life. Mock them!`, gameState.score, gameState.ammo, true);
      } else {
        setGameState(prev => ({ ...prev, lives: newLives, streak: 0 }));
        updateCommentary(`Hit a boom! Only ${newLives} lives left. Loser Energy!`, gameState.score, gameState.ammo, true);
        addEffect("💥 BOOM!", clientX, clientY - 40, "text-orange-500 font-black scale-125");
      }
    } else {
      playSFX(POP_SFX_URL, 0.5);
      const newStreak = gameState.streak + 1;
      const newScore = gameState.score + balloon.points;
      
      let wonTeddy = false;
      let wonConsolation = false;
      let wonMini = false;
      
      if (newStreak === 5) {
        wonTeddy = true;
        addEffect("🧸 BIG TEDDY WON!", clientX, clientY - 80, "text-pink-400 font-bold scale-150", 3000);
        setShowPrizeOverlay('teddy');
        updateCommentary(`Player actually hit a 5 streak? I guess ${gameState.playerName} earned the bear...`, newScore, gameState.ammo, true);
      }
      if (newScore >= 10 && !gameState.hasConsolation) {
        wonConsolation = true;
        addEffect("🤖 SOFT TOY WON!", clientX, clientY - 40, "text-yellow-400 font-bold scale-125", 2500);
      }
      if (newScore >= 25 && !gameState.hasMiniPrize) {
        wonMini = true;
        addEffect("🐟 MINI PRIZE WON!", clientX, clientY - 60, "text-cyan-400 font-bold scale-125", 2500);
      }

      setGameState(prev => ({ 
        ...prev, 
        score: newScore, 
        streak: newStreak, 
        hasTeddy: prev.hasTeddy || wonTeddy,
        hasConsolation: prev.hasConsolation || wonConsolation,
        hasMiniPrize: prev.hasMiniPrize || wonMini
      }));

      const remainingBalloons = balloons.filter(b => b.id !== balloon.id && !b.popped && b.type !== 'hazard').length;
      if (remainingBalloons <= 5) {
        handleLevelComplete();
        endLevel = true;
      } else if (newStreak < 5) {
        updateCommentary(`Hit a balloon. Big deal.`, newScore, gameState.ammo);
      }
    }

    addEffect(effectText, clientX, clientY, effectColor);
    setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popped: true } : b));
    return endLevel;
  };

  const handlePop = async (id: string, e: React.MouseEvent) => {
    if (gameState.ammo <= 0 || gameState.status !== 'playing' || showPrizeOverlay || showHowToPlay) return;
    const balloon = balloons.find(b => b.id === id);
    if (!balloon || balloon.popped) return;
    triggerFireEffects();
    popBalloonInternal(balloon, e.clientX, e.clientY);
  };

  const handleMiss = (e: React.MouseEvent) => {
    if (gameState.status !== 'playing' || gameState.ammo <= 0 || showPrizeOverlay || showHowToPlay) return;
    if ((e.target as HTMLElement).closest('.balloon-clickable')) return;
    if ((e.target as HTMLElement).closest('.inventory-item')) return;
    if ((e.target as HTMLElement).closest('.prize-slot')) return;
    if ((e.target as HTMLElement).closest('.mute-toggle')) return;
    if ((e.target as HTMLElement).closest('.nav-button')) return;

    triggerFireEffects();
    const newAmmo = gameState.ammo - 1;
    setGameState(prev => ({ ...prev, ammo: newAmmo, streak: 0 }));

    if (newAmmo <= 0) {
      setDeathCause(`TIME IS MONEY, ${gameState.playerName.toUpperCase()}! You're out of ammo and patience!`);
      setGameState(prev => ({ ...prev, status: 'gameover' }));
      updateCommentary('Out of ammo. Another loser for the pile!', gameState.score, 0, true);
    } else {
        updateCommentary('MISS! Did you leave your brain in the lobby?', gameState.score, newAmmo);
    }
    addEffect("MISS", e.clientX, e.clientY, "text-slate-500", 800);
  };

  const updateCommentary = async (event: string, score: number, ammo: number, force: boolean = false) => {
    const now = Date.now();
    if (!force && now - lastCommentaryTime.current < COMMENTARY_COOLDOWN) return;
    setLoadingCommentary(true);
    try {
      const comm = await getStallOwnerCommentary(event, score, ammo, gameState.playerName);
      setCommentary(comm);
      lastCommentaryTime.current = now;
    } catch (e) {
      const randomWit = LOCAL_WITS[Math.floor(Math.random() * LOCAL_WITS.length)];
      setCommentary({ text: randomWit, mood: 'cheeky' });
    } finally {
      setLoadingCommentary(false);
    }
  };

  const handleLevelComplete = () => {
    setGameState(prev => ({ ...prev, level: prev.level + 1, ammo: INITIAL_AMMO, streak: 0 }));
    updateCommentary('Stage cleared? My pockets are still fatter than yours!', gameState.score, INITIAL_AMMO, true);
  };

  const goHome = () => {
    setGameState(prev => ({ ...prev, status: 'start', playerName: '' }));
    setNameInput('');
  };

  const startGame = () => {
    if (!nameInput.trim()) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    tryStartMusic();
    setGameState({ 
      playerName: nameInput.trim(), score: 0, ammo: INITIAL_AMMO, lives: INITIAL_LIVES,
      level: 1, status: 'playing', streak: 0, 
      hasTeddy: false, hasConsolation: false, hasMiniPrize: false, weapon: 'rifle' 
    });
    setDeathCause(null);
    setShowPrizeOverlay(null);
    setShowHowToPlay(false);
  };

  const getGunTransform = () => {
    const centerX = window.innerWidth / 2;
    const moveX = (mousePos.x - centerX) * 0.1; 
    const recoilY = isFiring ? 30 : 0;
    const recoilRot = isFiring ? -5 : 0;
    return `translateX(${moveX}px) translateY(${recoilY}px) rotate(${recoilRot}deg) scale(0.7)`;
  };

  const selectWeapon = (w: WeaponType) => {
    setGameState(prev => ({ ...prev, weapon: w }));
    updateCommentary(`Switched to ${w}. Won't help your loser energy.`, gameState.score, gameState.ammo, true);
  };

  const renderCurrentWeapon = () => {
    const nameStyles = "font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] tracking-wider whitespace-nowrap";
    switch (gameState.weapon) {
      case 'handgun':
        return (
          <div className="relative w-40 h-[300px] flex flex-col items-center">
            <div className="w-14 h-48 bg-slate-800 border-4 border-slate-700 rounded-t-lg relative shadow-2xl overflow-hidden">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-32 bg-black/20 rounded-full"></div>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 transform -rotate-90"><div className={`${nameStyles} text-lg`}>蘇朱爾</div></div>
            </div>
            <div className="w-20 h-24 bg-slate-900 border-4 border-slate-700 rounded-b-3xl -mt-4 shadow-xl"></div>
          </div>
        );
      case 'ak47':
        return (
          <div className="relative w-48 h-[550px] flex flex-col items-center">
            <div className="w-10 h-[380px] bg-slate-700 border-x-4 border-t-4 border-slate-600 rounded-t-md relative shadow-inner overflow-hidden">
              <div className="absolute top-20 left-1/2 -translate-x-1/2 w-14 h-12 bg-slate-800 border-2 border-slate-600 rounded-sm"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-10 bg-black/40"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 transform -rotate-90"><div className={`${nameStyles} text-2xl`}>蘇朱爾</div></div>
            </div>
            <div className="w-24 h-48 bg-amber-950 border-x-8 border-b-8 border-amber-900 rounded-b-3xl -mt-6"></div>
          </div>
        );
      case 'sniper':
        return (
          <div className="relative w-40 h-[650px] flex flex-col items-center">
             <div className="w-6 h-[500px] bg-slate-800 border-x-2 border-t-2 border-slate-600 rounded-t-full relative overflow-hidden">
               <div className="absolute top-40 left-1/2 -translate-x-1/2 w-16 h-12 bg-slate-900 border-2 border-slate-600 rounded-md">
                 <div className="w-full h-full flex items-center justify-center text-[8px] text-green-500 font-bold">SCOPE</div>
               </div>
               <div className="absolute top-[20%] left-1/2 -translate-x-1/2 transform -rotate-90"><div className={`${nameStyles} text-xl`}>蘇朱爾</div></div>
             </div>
             <div className="w-20 h-40 bg-slate-900 border-4 border-slate-700 rounded-b-2xl -mt-4"></div>
          </div>
        );
      default:
        return (
          <div className="relative w-56 h-[550px] flex flex-col items-center">
            <div className="w-12 h-[350px] bg-gradient-to-b from-slate-600 via-slate-800 to-black border-x-4 border-t-4 border-slate-700 rounded-t-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-2 h-[220px] bg-red-400/20 rounded-full"></div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-3 bg-slate-900 rounded-sm"></div>
              <div className="absolute top-[35%] left-1/2 -translate-x-1/2 transform rotate(90deg)"><div className={`${nameStyles} text-xl`}>蘇朱爾</div></div>
            </div>
            <div className="w-28 h-56 bg-slate-900 border-x-4 border-b-4 border-slate-800 rounded-b-[50px] -mt-8 relative shadow-2xl overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-12"><div className={`${nameStyles} text-4xl opacity-100`}>蘇朱爾</div></div>
            </div>
          </div>
        );
    }
  };

  const StringLight = ({ top, skew, delay }: { top: string, skew: number, delay: string }) => (
    <div className="string-light-row" style={{ top, transform: `translateX(-5%) rotate(${skew}deg)` }}>
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="string-light-bulb" style={{ '--flicker-dur': `${2 + Math.random() * 3}s`, animationDelay: `${Math.random() * 2}s` } as any} />
      ))}
    </div>
  );

  const PrizeView = () => {
    if (!showPrizeOverlay) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
        <div className="relative max-w-lg w-full p-8 text-center">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 animate-bounce">
            <h2 className="text-6xl font-bungee text-yellow-400 drop-shadow-[0_0_20px_#fbbf24]">NEW PRIZE!</h2>
          </div>
          <div className="bg-gradient-to-b from-amber-100 to-amber-200 p-12 rounded-[40px] shadow-[0_0_60px_rgba(251,191,36,0.3)] border-[10px] border-white relative">
            {showPrizeOverlay === 'teddy' ? (
              <div className="flex flex-col items-center">
                <div className="relative w-64 h-64 flex items-center justify-center">
                  <div className="absolute w-48 h-48 bg-[#92623a] rounded-full top-8 shadow-inner"></div>
                  <div className="absolute w-40 h-36 bg-[#a67145] rounded-full -top-4 border-b-4 border-[#825632]"></div>
                  <div className="absolute w-14 h-14 bg-[#a67145] rounded-full -top-6 -left-2 border-2 border-[#825632]"></div>
                  <div className="absolute w-14 h-14 bg-[#a67145] rounded-full -top-6 -right-2 border-2 border-[#825632]"></div>
                  <div className="absolute w-6 h-6 bg-black rounded-full top-10 left-12"></div>
                  <div className="absolute w-6 h-6 bg-black rounded-full top-10 right-12"></div>
                  <div className="absolute w-16 h-12 bg-[#dcb88d] rounded-full top-16"></div>
                  <div className="absolute w-6 h-4 bg-[#4a2e16] rounded-full top-18"></div>
                  <div className="absolute w-18 h-18 bg-[#a67145] rounded-full bottom-0 -left-6 border-2 border-[#825632]"></div>
                  <div className="absolute w-18 h-18 bg-[#a67145] rounded-full bottom-0 -right-6 border-2 border-[#825632]"></div>
                </div>
                <h3 className="text-4xl font-bungee text-[#4a2e16] mt-8">BIG FLUFFY TEDDY</h3>
                <p className="text-[#825632] font-bold mt-2 uppercase tracking-widest">Won by 5-Pop Streak!</p>
              </div>
            ) : showPrizeOverlay === 'consolation' ? (
              <div className="flex flex-col items-center">
                <i className="fas fa-robot text-9xl text-slate-800 animate-bounce"></i>
                <h3 className="text-4xl font-bungee text-slate-900 mt-8">RETRO ROBOT</h3>
                <p className="text-slate-600 font-bold mt-2 uppercase tracking-widest">Won by reaching 10 points!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <i className="fas fa-fish text-9xl text-cyan-600 animate-pulse"></i>
                <h3 className="text-4xl font-bungee text-cyan-950 mt-8">NEON FISH</h3>
                <p className="text-cyan-800 font-bold mt-2 uppercase tracking-widest">Won by reaching 25 points!</p>
              </div>
            )}
            <button onClick={() => setShowPrizeOverlay(null)} className="mt-12 px-10 py-4 bg-red-600 text-white font-bungee text-xl rounded-2xl hover:bg-red-500 transition-all border-b-4 border-red-800 active:translate-y-1 active:border-b-0">COLLECT PRIZE</button>
          </div>
          <div className="mt-8 text-white/50 font-bungee animate-pulse">CLICK ANYWHERE TO CLOSE</div>
        </div>
      </div>
    );
  };

  const GateBoundary = () => (
    <div className="absolute bottom-[160px] w-full h-40 z-[45] pointer-events-none flex items-end">
       {Array.from({ length: 4 }).map((_, i) => (
         <div key={i} className="flex-1 h-full relative border-x border-amber-950/20">
            <div className="absolute top-0 w-full h-4 bg-wood-fence rounded-sm border-y border-amber-900/30"></div>
            <div className="absolute bottom-4 w-full h-4 bg-wood-fence rounded-sm border-y border-amber-900/30"></div>
            <div className="absolute inset-0 flex items-center justify-center opacity-90">
               <div className="absolute w-[110%] h-3 bg-wood-fence rotate-[25deg] shadow-lg border-y border-amber-900/30"></div>
               <div className="absolute w-[110%] h-3 bg-wood-fence rotate-[-25deg] shadow-lg border-y border-amber-900/30"></div>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-3 bg-wood-fence opacity-80 border-y border-amber-900/20"></div>
            <div className="absolute left-0 h-full w-4 bg-wood-fence -translate-x-1/2 shadow-xl border-x border-amber-900/40"></div>
            <div className="absolute right-0 h-full w-4 bg-wood-fence translate-x-1/2 shadow-xl border-x border-amber-900/40"></div>
         </div>
       ))}
    </div>
  );

  const HowToPlayOverlay = () => {
    if (!showHowToPlay) return null;
    return (
      <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in duration-300">
        <div className="bg-wood-dark border-8 border-amber-900 max-w-2xl w-full p-10 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button onClick={() => setShowHowToPlay(false)} className="absolute top-4 right-4 w-12 h-12 bg-red-600 rounded-full text-white flex items-center justify-center hover:bg-red-500 transition-all font-bungee text-2xl">X</button>
          
          <h2 className="text-4xl font-bungee text-yellow-500 mb-6 border-b-4 border-amber-900 pb-2">THE EXPLOSION STATION MANIFESTO</h2>
          
          <div className="space-y-6 text-left font-bungee">
            <p className="text-white text-base border-l-4 border-red-600 pl-4 bg-red-950/30 py-4 leading-relaxed italic">
              "Listen up, you fresh piece of debris, and step into the Explosion Station where your worthless life finally gets a purpose: getting incinerated! I can smell your 'Newbie Spirit' from here, and it reeks of soy and damp cardboard! We play the 30% Boom Game, meaning only the radioactive few have the spine to actually detonate into greatness. The other 70% is the Junnel Tax, the fee you pay for the privilege of wasting my oxygen with your loser energy. Now pull the lever and prove you aren't a total waste of space, or get vaporized by the sheer force of my boredom!"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-amber-900/20 p-4 border border-amber-900 rounded-xl">
                <p className="text-red-500 text-sm mb-1 uppercase tracking-wider font-black">Mechanic</p>
                <p className="text-white text-xs">Boom Balloons cost <span className="text-red-500">1 Life</span>. Don't be a math-loving weakling!</p>
              </div>
              <div className="bg-amber-900/20 p-4 border border-amber-900 rounded-xl">
                <p className="text-yellow-500 text-sm mb-1 uppercase tracking-wider font-black">Prize List</p>
                <ul className="text-[10px] text-yellow-200/80 space-y-1 list-disc ml-3">
                  <li>Pop 5 streak: <span className="text-pink-400">BIG TEDDY</span></li>
                  <li>10 points: <span className="text-yellow-400">SOFT TOY</span></li>
                  <li>25 points: <span className="text-cyan-400">MINI PRIZE</span></li>
                </ul>
              </div>
            </div>
          </div>
          
          <button onClick={() => { tryStartMusic(); setShowHowToPlay(false); }} className="mt-10 w-full py-4 bg-yellow-500 text-amber-950 font-bungee text-2xl rounded-xl hover:bg-yellow-400 active:translate-y-1 transition-all">PULL THE LEVER! BOOM!</button>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden market-bg flex flex-col items-center justify-center crosshair ${isShaking ? 'shake' : ''}`} onClick={handleMiss}>
      <PrizeView />
      <HowToPlayOverlay />

      {/* Control Buttons */}
      <div className="fixed top-6 right-6 z-[150] flex flex-col gap-3 items-end">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); tryStartMusic(); }} 
          className="w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all mute-toggle hover:scale-110 active:scale-95 shadow-xl bg-slate-900/80 backdrop-blur-md" 
          style={{ borderColor: isMuted ? '#ef4444' : '#eab308', color: isMuted ? '#ef4444' : '#eab308' }}
        >
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-2xl`}></i>
        </button>
        
        {gameState.status === 'playing' && (
          <button 
            onClick={(e) => { e.stopPropagation(); goHome(); }} 
            className="nav-button px-4 py-2 bg-red-600/20 border-2 border-red-600 text-red-500 font-bungee text-xs rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-lg animate-in fade-in slide-in-from-right-4 duration-300"
          >
            LEAVE STALL
          </button>
        )}
      </div>

      <div className="fixed inset-0 pointer-events-none z-0"><StringLight top="5%" skew={-2} delay="0s" /><StringLight top="15%" skew={1} delay="0.5s" /><StringLight top="25%" skew={-1} delay="1.2s" /></div>
      <div className="absolute inset-0 vignette pointer-events-none z-30"></div>
      {isFlashing && <div className="fixed inset-0 z-[60] bg-red-500/10 pointer-events-none"></div>}
      {popEffects.map(effect => (
        <div key={effect.id} className={`fixed z-[70] font-bungee text-3xl pointer-events-none prize-float ${effect.color} drop-shadow-[0_0_20px_rgba(0,0,0,1)] text-center whitespace-nowrap`} style={{ left: effect.x, top: effect.y - 40 }}>{effect.text}</div>
      ))}
      <Stats score={gameState.score} ammo={gameState.ammo} lives={gameState.lives} level={gameState.level} streak={gameState.streak} hasTeddy={gameState.hasTeddy} />
      
      {gameState.status === 'start' && (
        <div className="z-50 text-center animate-in zoom-in duration-500 max-w-xl w-full px-6 flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center">
             <h2 className="text-2xl md:text-3xl font-bungee text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">JUNNEL DANGER'S</h2>
             <h1 className="text-6xl md:text-8xl font-bungee text-red-500 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] leading-none -mt-2">EXPLOSION STATION</h1>
          </div>
          
          <div className="bg-slate-900/90 border-4 border-amber-900 p-8 rounded-[40px] shadow-2xl backdrop-blur-md mb-8 w-full">
            <p className="text-yellow-500 font-bungee text-lg mb-4 tracking-widest uppercase">Register for your own destruction</p>
            <input 
              type="text" 
              maxLength={15}
              placeholder="ENTER PATHETIC NAME..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-6 py-4 bg-black border-2 border-red-600 text-white font-bungee text-xl rounded-2xl mb-6 text-center focus:outline-none focus:ring-4 focus:ring-red-600/30 placeholder:text-red-900/50"
              onKeyDown={(e) => e.key === 'Enter' && startGame()}
            />
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }} 
                disabled={!nameInput.trim()}
                className={`px-12 py-6 border-b-8 font-bungee text-3xl rounded-xl shadow-2xl transition-all duration-300 active:translate-y-2 active:border-b-0 ${nameInput.trim() ? 'bg-red-600 border-red-800 text-white hover:bg-red-500' : 'bg-slate-800 border-slate-950 text-slate-600 cursor-not-allowed opacity-50'}`}
              >
                STEP UP AND LOSE!
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); tryStartMusic(); setShowHowToPlay(true); }} 
                className="px-12 py-4 bg-amber-900 border-b-4 border-amber-950 text-white font-bungee text-xl hover:bg-amber-800 transition-all duration-300 rounded-xl active:translate-y-1 active:border-b-0"
              >
                HOW TO PLAY
              </button>
            </div>
          </div>

          <div className="bg-red-600/20 border-2 border-red-600 p-3 rounded-xl backdrop-blur-sm w-fit">
            <p className="text-red-500 font-bungee text-xl animate-pulse uppercase tracking-widest">70% Failure rate guaranteed!</p>
          </div>
        </div>
      )}
      
      {gameState.status === 'playing' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <div className="absolute top-10 w-full z-40 flex flex-col items-center"><div className="flex gap-24"><div className="bulb-main"></div><div className="bulb-main"></div><div className="bulb-main"></div></div></div>
          <div className="absolute left-[3%] top-[15%] bottom-[35%] w-24 flex flex-col items-center gap-4 z-[110] pointer-events-auto">
            <div className="stall-pole w-2 h-full absolute left-1/2 -translate-x-1/2 opacity-30"></div>
            <div className="text-[10px] font-bungee text-yellow-500 mb-2 whitespace-nowrap bg-amber-950/80 px-2 py-1 rounded border border-amber-900">Armory</div>
            {(['rifle', 'ak47', 'sniper', 'handgun'] as WeaponType[]).map(w => (
              <button key={w} onClick={(e) => { e.stopPropagation(); selectWeapon(w); }} className={`inventory-item relative w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${gameState.weapon === w ? 'bg-red-600 border-white scale-110 shadow-lg' : 'bg-amber-950/90 border-amber-900 opacity-70'}`}>
                 <i className={`fas ${w === 'rifle' ? 'fa-crosshairs' : w === 'ak47' ? 'fa-meteor' : w === 'sniper' ? 'fa-eye' : 'fa-gun'} text-white text-lg`}></i><span className="text-[7px] font-bungee mt-1 text-white">{w.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="absolute right-[5%] top-[12%] bottom-[30%] w-28 flex flex-col items-center gap-10 z-[120] pointer-events-auto transform scale-[0.9]">
            <div className="w-3 h-full absolute left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 shadow-xl border-x border-black/20 z-0"></div>
            <div className="relative z-10 flex flex-col items-center prize-slot cursor-pointer group" onClick={(e) => { e.stopPropagation(); if(gameState.hasTeddy) setShowPrizeOverlay('teddy'); }}>
              <div className={`absolute -top-7 text-[12px] font-bungee whitespace-nowrap transition-all duration-500 drop-shadow-[0_0_2px_4px_rgba(0,0,0,0.8)] ${gameState.hasTeddy ? 'text-pink-300 scale-110' : 'text-slate-400 opacity-80'}`}>BIG PRIZE</div>
              <div className={`relative w-20 h-20 rounded-2xl border-4 transition-all duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden group-hover:scale-110 ${gameState.hasTeddy ? 'bg-gradient-to-br from-pink-500 to-pink-700 border-pink-300 scale-110 shadow-pink-500/30' : 'bg-slate-900/80 border-slate-700/50'}`}>
                {gameState.hasTeddy ? (
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute w-10 h-10 bg-[#92623a] rounded-full top-1"></div><div className="absolute w-8 h-8 bg-[#a67145] rounded-full -top-1"></div>
                    <div className="absolute w-2 h-2 bg-black rounded-full top-1 left-2"></div><div className="absolute w-2 h-2 bg-black rounded-full top-1 right-2"></div>
                  </div>
                ) : <i className="fas fa-question text-white/20 text-3xl"></i>}
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center prize-slot cursor-pointer group" onClick={(e) => { e.stopPropagation(); if(gameState.hasConsolation) setShowPrizeOverlay('consolation'); }}>
              <div className={`absolute -top-7 text-[12px] font-bungee whitespace-nowrap transition-all duration-500 drop-shadow-[0_0_2px_4px_rgba(0,0,0,0.8)] ${gameState.hasConsolation ? 'text-yellow-300 scale-110' : 'text-slate-400 opacity-80'}`}>SOFT TOY</div>
              <div className={`relative w-20 h-20 rounded-2xl border-4 transition-all duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center justify-center group-hover:scale-110 ${gameState.hasConsolation ? 'bg-gradient-to-br from-yellow-500 to-amber-700 border-yellow-200 scale-110 shadow-yellow-500/30' : 'bg-slate-900/80 border-slate-700/50'}`}><i className={`fas fa-robot text-3xl ${gameState.hasConsolation ? 'text-white animate-bounce' : 'text-white/20'}`}></i></div>
            </div>
            <div className="relative z-10 flex flex-col items-center prize-slot cursor-pointer group" onClick={(e) => { e.stopPropagation(); if(gameState.hasMiniPrize) setShowPrizeOverlay('mini'); }}>
              <div className={`absolute -top-7 text-[12px] font-bungee whitespace-nowrap transition-all duration-500 drop-shadow-[0_0_2px_4px_rgba(0,0,0,0.8)] ${gameState.hasMiniPrize ? 'text-cyan-300 scale-110' : 'text-slate-400 opacity-80'}`}>MINI PRIZE</div>
              <div className={`relative w-20 h-20 rounded-2xl border-4 transition-all duration-700 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center justify-center group-hover:scale-110 ${gameState.hasMiniPrize ? 'bg-gradient-to-br from-cyan-500 to-blue-700 border-cyan-200 scale-110 shadow-cyan-500/30' : 'bg-slate-900/80 border-slate-700/50'}`}><i className={`fas fa-fish text-3xl ${gameState.hasMiniPrize ? 'text-white animate-pulse' : 'text-white/20'}`}></i></div>
            </div>
          </div>
          <div className="relative w-full max-w-lg h-[35vh] flex items-center justify-center p-6 bg-wood border-[10px] border-amber-950 rounded shadow-2xl z-20 -translate-y-24 scale-[0.85]">
            <div className="w-full h-full bg-black/40 rounded shadow-inner p-4">
              <div className="grid grid-cols-10 grid-rows-6 w-full h-full gap-2">
                {balloons.map((b) => (
                  <div key={b.id} id={b.id} className="balloon-clickable relative flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handlePop(b.id, e); }}>
                    {!b.popped && <div className="balloon-body balloon-float cursor-crosshair transition-all duration-300" style={{ backgroundColor: b.color, width: '24px', height: '32px', boxShadow: `0 3px 6px rgba(0,0,0,0.4), inset -2px -2px 6px rgba(0,0,0,0.5)` }}><div className="absolute top-1 left-1.5 w-1.5 h-2.5 bg-white/20 rounded-full blur-[0.5px]"></div></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <GateBoundary /><div className="absolute bottom-0 w-full h-40 bg-wood border-t-[12px] border-amber-900 z-40 shadow-[0_-10px_50px_rgba(0,0,0,0.7)]"></div>
        </div>
      )}
      
      {gameState.status === 'gameover' && (
        <div className="z-50 text-center animate-in slide-in-from-bottom-20 duration-500 flex flex-col items-center">
          <h2 className={`text-8xl font-bungee mb-4 uppercase drop-shadow-xl ${(gameState.hasTeddy || gameState.hasConsolation) ? 'text-yellow-400' : 'text-red-600'}`}>{(gameState.hasTeddy || gameState.hasConsolation) ? "STILL A LOSER!" : "JUNNEL TAX COLLECTED!"}</h2>
          <p className="text-white text-xl mb-10 font-bungee bg-black/60 px-8 py-3 rounded-xl border border-red-500/30">{deathCause}</p>
          <div className="bg-amber-950 border-8 border-amber-900 p-10 rounded-xl mb-12 shadow-2xl inline-block relative min-w-[300px]"><p className="text-sm text-yellow-500 uppercase tracking-[0.5em] mb-4 font-bungee">Money Stolen by Junnel</p><p className="text-9xl text-white font-bungee">{gameState.score}</p></div>
          <div className="flex flex-col md:flex-row gap-4">
            <button onClick={(e) => { e.stopPropagation(); startGame(); }} className="px-12 py-6 bg-red-600 border-b-8 border-red-800 text-white font-bungee text-2xl rounded-xl hover:bg-red-500 shadow-2xl transition-all active:translate-y-2 active:border-b-0">TRY AGAIN</button>
            <button onClick={(e) => { e.stopPropagation(); goHome(); }} className="px-12 py-6 bg-amber-800 border-b-8 border-amber-950 text-white font-bungee text-2xl rounded-xl hover:bg-amber-700 shadow-2xl transition-all active:translate-y-2 active:border-b-0">GO HOME</button>
          </div>
        </div>
      )}
      
      <StallOwner commentary={commentary} loading={loadingCommentary} />
      {gameState.status === 'playing' && (
        <div className="fixed bottom-[-140px] left-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-75 ease-out z-[100]" style={{ transform: getGunTransform() }}>
          {renderCurrentWeapon()}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 bg-black/90 px-4 py-2 rounded-lg border-2 border-yellow-500/50 z-50"><div className="text-xl text-yellow-500 font-bungee tracking-[0.2em]">{gameState.ammo.toString().padStart(2, '0')}</div></div>
        </div>
      )}
      <div className="fixed bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-[#1c1917] to-transparent pointer-events-none z-[90]"></div>
    </div>
  );
};

export default App;
