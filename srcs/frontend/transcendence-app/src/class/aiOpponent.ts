import type { GameState, Controller } from "../types/game";

export class AIOpponent {
  private lastThink = 0;
  private state: GameState;
  private controller: Controller;
  private keyState: Record<string, boolean>;

  constructor(
    state: GameState,
    controller: Controller,
    keyState: Record<string, boolean>
  ) {
    this.state = state;
    this.controller = controller;
    this.keyState = keyState;
  }

  public think(now: number) {
    if (now - this.lastThink < 1000) return;
    this.lastThink = now;

    const { ball, players } = this.state;
    const me = players.find(p => p.side === this.controller.side)!;
    const timeToReach = Math.abs((ball.x - me.x) / ball.vx);
    const futureY = ball.y + ball.vy * timeToReach;

    const centerY = me.y + me.height / 2;
    const threshold = 10;

    console.log(
      `[AI:${this.controller.side}] now=${now.toFixed(0)} lastThink=${this.lastThink.toFixed(0)} ` +
      `ball=(${ball.x.toFixed(1)},${ball.y.toFixed(1)}) vx=${ball.vx.toFixed(1)} vy=${ball.vy.toFixed(1)} ` +
      `timeToReach=${timeToReach.toFixed(1)} futureY=${futureY.toFixed(1)} centerY=${centerY.toFixed(1)}`
    ); //! DELETE 

    if (centerY < futureY - threshold) {
      this.setKeys('down');
    } else if (centerY > futureY + threshold) {
      this.setKeys('up');
    } else {
      this.clearKeys();
    }
  }

  private setKeys(dir: 'up' | 'down') {
    console.log(`[AI:${this.controller.side}] setKeys → ${dir.toUpperCase()}`); //! DELETE
    if (this.controller.upKey)
      this.keyState[this.controller.upKey] = false;
    if (this.controller.downKey)
      this.keyState[this.controller.downKey] = false;

    const key = dir === 'up'
      ? this.controller.upKey!
      : this.controller.downKey!;
    this.keyState[key] = true;
  }

  private clearKeys() {
    console.log(`[AI:${this.controller.side}] clearKeys`); //! DELETE
    if (this.controller.upKey)
      this.keyState[this.controller.upKey] = false;
    if (this.controller.downKey)
      this.keyState[this.controller.downKey] = false;
  }
}
