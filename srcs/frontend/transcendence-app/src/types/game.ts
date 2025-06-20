export interface GameSettings {
  mode: string;
  game_type: string;
  game_mode: string;
  max_players: number;
  num_games: number;
  num_matches: number;
  ball_speed: number;
  death_timed: boolean;
  time_limit_s: number;
}

export interface PlayerConfig {
  player_id: number;
  username: string;
  paddle_loc: string;
  paddle_side: 'left' | 'right';
}

export interface GameDetails {
  gameId: number;
  matchId?: number;
  settings: GameSettings;
  players: PlayerConfig[];
}


export interface GamePageElements {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  leftNames: HTMLElement;
  rightNames: HTMLElement;
}

export interface LocalPlayer {
  id: number;
  side: 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Controller {
  playerId: number;
  side: 'left' | 'right';
  upKey?: string;
  downKey?: string;
}

export interface GameState {
  ball: { x: number; y: number; vx: number; vy: number; width: number };
  players: LocalPlayer[];
  score: Record<'left'|'right', number>;   
  totalScore: Record<'left'|'right', number>; 
  canvasWidth: number;
  canvasHeight: number;
  settings: GameSettings;
  gameStarted: boolean;
  gameOver: boolean;
  isPaused: boolean;
}