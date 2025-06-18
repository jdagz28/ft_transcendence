export type HitMap = Record<number, number>;
export type ScoreMap = Record<number, number>;


export interface StatsPayload {
  duration_ms: number;
  hits: HitMap;
  scores: ScoreMap;
}

export interface GameStatusUpdate {
  status: 'active' | 'paused' | 'aborted' | 'finished';
  matchId?: number;
  stats?: StatsPayload;
}