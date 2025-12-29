
export type BalloonType = 'normal' | 'bonus' | 'hazard' | 'challenge';
export type WeaponType = 'rifle' | 'ak47' | 'sniper' | 'handgun';

export interface Balloon {
  id: string;
  type: BalloonType;
  color: string;
  points: number;
  popped: boolean;
  x: number;
  y: number;
}

export interface GameState {
  playerName: string;
  score: number;
  ammo: number;
  lives: number;
  level: number;
  status: 'start' | 'playing' | 'gameover' | 'victory';
  streak: number;
  hasTeddy: boolean;
  hasConsolation: boolean;
  hasMiniPrize: boolean;
  weapon: WeaponType;
}

export interface Commentary {
  text: string;
  mood: 'happy' | 'cheeky' | 'impressed' | 'disappointed';
}
