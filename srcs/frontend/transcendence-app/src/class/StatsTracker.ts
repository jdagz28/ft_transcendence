import type { HitMap, ScoreMap, StatsPayload } from '../types/game_api';

type Side = 'left' | 'right';

export class StatsTracker {
  private sessionStart = performance.now();
  private matchStart = performance.now();

  private totalHits : HitMap = {};
  private matchHits : HitMap = {};
  private sideScore : Record<Side, number>;
  
  private readonly sideMap: Record<Side, number[]>;

  constructor(sideMap: Record<Side, number[]>) {
    this.sideMap = sideMap;
    this.sessionStart = performance.now();
    this.matchStart   = performance.now();

    this.totalHits  = {};
    this.matchHits  = {};
    this.sideScore  = { left: 0, right: 0 };
  } 

  hit(playerId:number) {
    if (playerId < 0) return;
    this.totalHits[playerId] = (this.totalHits[playerId] ?? 0) + 1;
    this.matchHits[playerId] = (this.matchHits[playerId] ?? 0) + 1;
  }

  addPoint(side: Side) {
    this.sideScore[side] += 1;
  }

  finishMatch(): StatsPayload {
    const perPlayerScore: ScoreMap = {};
    (['left', 'right'] as Side[]).forEach(side => {
      for (const playerId of this.sideMap[side]) {
        perPlayerScore[playerId] = this.sideScore[side];
      }
    });

    const out: StatsPayload = {
      duration_ms: Math.trunc(performance.now() - this.matchStart),
      hits: { ...this.matchHits },
      scores: perPlayerScore
    };

    this.matchStart = performance.now();
    this.matchHits = {};
    this.sideScore = { left: 0, right: 0 };
    return out;
  }

  finishSession(): StatsPayload {
    const perPlayerScore: ScoreMap = {};
    (['left', 'right'] as Side[]).forEach(side => {
      for (const playerId of this.sideMap[side]) {
        perPlayerScore[playerId] = this.sideScore[side];
      }
    });

    return {
      duration_ms: Math.trunc(performance.now() - this.sessionStart),
      hits: { ...this.totalHits },
      scores: perPlayerScore
    };
  }

  shiftTimes(deltaMs: number) {
    this.sessionStart += deltaMs;
    this.matchStart += deltaMs;
  }
}