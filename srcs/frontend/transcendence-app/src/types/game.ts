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