export type HitMap = Record<number, number>;
export type ScoreMap = Record<number, number>;


export interface StatsPayload {
  duration_ms: number;
  hits: HitMap;
  scores: ScoreMap;
}

export interface GameStatusUpdate {
  status: 'active' | 'paused' | 'in-game' | 'aborted' | 'finished';
  gameId: number;
  matchId?: number;
  stats?: StatsPayload;
}

export interface TourPlayer {
  id: number;
  username: string;
  alias?: string;
  paddle_loc: string;
  avatarUrl: string;
}