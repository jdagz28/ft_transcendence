import type { RouteParams } from "../router";
import type { PlayerConfig, GameDetails, GamePageElements, LocalPlayer, Controller, GameState } from "../types/game";
import { getConfig, sendStatus } from "../api/gameService";
import { AIOpponent } from "../class/AiOpponent";
import { StatsTracker } from "../class/StatsTracker";
import type { GameStatusUpdate } from "../types/game_api";


function setupDom(root: HTMLElement): GamePageElements {
  root.innerHTML = "";

  const container = document.createElement('main');
  container.id = 'game-container';
  container.className = "relative w-full h-screen bg-black overflow-hidden";

  const canvas = document.createElement('canvas');
  canvas.id = 'pong-canvas';
  canvas.className = "w-full h-full";
  container.appendChild(canvas);

  const leftNames = document.createElement('div');
  leftNames.id = 'paddle-left-names';
  leftNames.className = "absolute top-4 left-4 flex flex-col space-y-1 text-white font-sans text-lg";
  container.appendChild(leftNames);

  const rightNames = document.createElement('div');
  rightNames.id = 'paddle-right-names';
  rightNames.className = "absolute top-4 right-4 flex flex-col space-y-1 text-white font-sans text-lg";
  container.appendChild(rightNames);

  root.appendChild(container);
  return { container, canvas, leftNames, rightNames}
}

export async function renderGamePage(params: RouteParams) {
  const app = document.getElementById("app")!;
  const { canvas, leftNames, rightNames } = setupDom(app);
  const ctx = canvas.getContext("2d")!;

  const rawId = params.gameId;
  const gameId = typeof rawId === "string" ? parseInt(rawId, 10) : (rawId ?? NaN);
  if (isNaN(gameId)) {
    app.innerHTML = `<h1 class="text-white font-sans">Missing or invalid gameId!</h1>`;
    return;
  }

  const config: GameDetails = await getConfig(gameId);
  const totalGames = config.settings.num_games; 
  const totalMatches = config.settings.num_matches;
  const totalPlayers = config.settings.max_players;
  const mode = config.settings.mode;
  let currMatchId = config.matchId

  let humanSide: 'left' | 'right';
  const sideMap: Record<'left'|'right', number[]> = { left: [], right: [] };
  config.players.forEach((p: PlayerConfig) => {
    sideMap[p.paddle_loc as 'left' | 'right'].push(p.player_id);
  });

  const statsTracker = new StatsTracker(sideMap);
  let pauseAt = 0;


  leftNames.innerHTML = "";
  rightNames.innerHTML = "";
  for (const p of config.players.filter((p: PlayerConfig) => p.paddle_loc === "left")) { 
    const el = document.createElement("div");
    el.textContent = p.username;
    el.className = "bg-white/20 px-2 py-1 rounded";
    leftNames.appendChild(el);
  }
  for (const p of config.players.filter((p: PlayerConfig) => p.paddle_loc === "right")) {  
    const el = document.createElement("div");
    el.textContent = p.username;
    el.className = "bg-white/20 px-2 py-1 rounded";
    rightNames.appendChild(el);
  }

  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.backgroundColor = 'black';

  window.addEventListener("resize", () => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  });

  let localGameState: GameState;
  let gameLoop: number | null = null;
    
  const paddleWidth = 25;
  const paddleHeight = 200;
  const margin = 50;
  const state: GameState = {
    ball: { 
      x: canvasWidth / 2, 
      y: canvasHeight / 2, 
      vx: 7, 
      vy: 6, 
      width: 15 
    },
    players: [
      { 
        id: sideMap.left[0] ?? -1,
        side: 'left', 
        x: margin,                         
        y: canvasHeight / 2 - paddleHeight / 2, 
        width: paddleWidth,  
        height: paddleHeight 
      },
      { 
        id: sideMap.right[0] ?? -1, 
        side: 'right', 
        x: canvasWidth - margin - paddleWidth, 
        y: canvasHeight / 2 - paddleHeight / 2, 
        width: paddleWidth,  
        height: paddleHeight 
      },
    ],
    score: { left: 0, right: 0 },
    totalScore: { left: 0, right: 0 }, 
    canvasWidth, 
    canvasHeight,
    settings: config.settings,
    gameStarted: false,
    gameOver: false,
    isPaused: false,
  }

  localGameState = state;

  const controllers: Controller[] = [];
  const aiOpponents: AIOpponent[] = [];

  if (mode === "single-player" || mode === "training") {
    const ai    = config.players.find(p => p.username === "AiOpponent");
    const human = config.players.find(p => p.username !== "AiOpponent");
    if (!human || !ai) {
      throw new Error("Couldn’t identify human or AI from config.players");
    }
    humanSide = human.paddle_loc as "left" | "right";

    const aiSide    = ai.paddle_loc   as "left" | "right";

    controllers.push({
      playerId: human.player_id,
      side:     humanSide,
      upKey:    "ArrowUp",
      downKey:  "ArrowDown",
    });

    controllers.push({
      playerId: ai.player_id,
      side:     aiSide,
      upKey:    "w",
      downKey:  "s",
    });
  } else {
    const leftConfs = config.players.filter(p => p.paddle_loc === 'left');
    const rightConfs = config.players.filter(p => p.paddle_loc === 'right');

    if (leftConfs.length >= 1 && rightConfs.length >= 1)
    {
      leftConfs.forEach((p, idx) => {
        if (leftConfs.length === 1) {
          controllers.push({ playerId: p.player_id, side: 'left', upKey: 'w', downKey: 's' });
        } else {
          if (idx === 0) controllers.push({ playerId: p.player_id, side: 'left', upKey: 'w' });
          else controllers.push({ playerId: p.player_id, side: 'left', downKey: 'l' });
        }
      });
      rightConfs.forEach((p, idx) => {
        if (rightConfs.length === 1) {
          controllers.push({ playerId: p.player_id, side: 'right', upKey: 'ArrowUp', downKey: 'ArrowDown' });
        } else {
          if (idx === 0) controllers.push({ playerId: p.player_id, side: 'right', upKey: 'ArrowUp' });
          else controllers.push({ playerId: p.player_id, side: 'right', downKey: 'Numpad5' });
        }
      });
    } else if (leftConfs.length == 1 || rightConfs.length == 1) {
      leftConfs.forEach(p => {
        controllers.push({ playerId: p.player_id, side: humanSide!, upKey: 'ArrowUp', downKey: 'ArrowDown' });
      });
    }
  }

  const keyState: Record<string, boolean> = {};
  controllers.forEach(c => { 
    if(c.upKey) 
      keyState[c.upKey] = false; 
    if(c.downKey) 
      keyState[c.downKey] = false; 
  });

  if (mode === "single-player" || mode === "training") {
    const aiCtrl = controllers[1];
    aiOpponents.push(new AIOpponent(localGameState, aiCtrl, keyState));
  }


  function stepLocalPhysics(state: GameState) {
    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= ball.width || ball.y >= state.canvasHeight - ball.width) {
      ball.vy *= -1;
      ball.y = Math.max(ball.width, Math.min(state.canvasHeight - ball.width, ball.y));
    }

    const left  = state.players.find(p => p.side === 'left')!;
    const right = state.players.find(p => p.side === 'right')!;

    if (ball.x - ball.width <= left.x + left.width && 
        ball.y >= left.y && 
        ball.y <= left.y + left.height &&
        ball.vx < 0) {
      ball.vx *= -1;
      ball.x = left.x + left.width + ball.width;
      statsTracker.hit(left.id);
    }

    if (ball.x + ball.width >= right.x && 
        ball.y >= right.y && 
        ball.y <= right.y + right.height &&
        ball.vx > 0) {
      ball.vx *= -1;
      ball.x = right.x - ball.width;
      statsTracker.hit(right.id);
    }

    if (ball.x < 0) {
      state.score.right++;
      statsTracker.addPoint('right');
      handlePoint('right', state);
      if (state.totalScore.right < totalGames || mode == "training") {
        resetBall(ball, state);
      } 
    } else if (ball.x > state.canvasWidth) {
      state.score.left++;
      statsTracker.addPoint('left');
      handlePoint('left', state);
      if (state.totalScore.left < totalGames || mode == "training") {
        resetBall(ball, state);
      } 
    }  
  }

  function handlePoint(side: 'left' | 'right', state: GameState) {
    if (state.score[side] === totalMatches) {
      state.totalScore[side]++;
      state.score.left = state.score.right = 0;

      const body: GameStatusUpdate = {
        status: 'active',
        gameId: gameId,
        matchId: currMatchId,
        stats: statsTracker.finishMatch()
      };
      console.log(`Sending status update for match ${currMatchId}:`, body); //!DELETE
      sendStatus(gameId, body).catch(console.error);
      if (state.totalScore[side] !== totalGames) 
        currMatchId++;
    }

    if (state.totalScore[side] === totalGames) {
      state.gameOver = true;
      sendStatus(gameId, { 
        status: 'finished',
        gameId: gameId,
        matchId: currMatchId,
        stats: statsTracker.finishSession()
      }).catch(console.error);
    }
    resetBall(state.ball, state);
  }

  function resetBall(ball: any, state: any) {
    ball.x = state.canvasWidth / 2;
    ball.y = state.canvasHeight / 2;
    ball.vx = Math.random() < 0.5 ? 7 : -7;
    ball.vy = Math.random() < 0.5 ? 6 : -6;
  }

  function updatePaddles(state:any) {
    const paddleSpeed = 8;
    for (const ctrl of controllers) {
      const paddle = state.players.find((p: LocalPlayer) => p.side === ctrl.side)!;
      if (ctrl.upKey && keyState[ctrl.upKey])   
        paddle.y = Math.max(0, paddle.y - paddleSpeed);
      if (ctrl.downKey && keyState[ctrl.downKey]) 
        paddle.y = Math.min(state.canvasHeight - paddle.height, paddle.y + paddleSpeed);
    }
  }

  function gameLoopFn(ts: number) {
    if (localGameState.gameStarted) {
      aiOpponents.forEach(ai => ai.think(ts));
      stepLocalPhysics(localGameState);
      updatePaddles(localGameState);
    }
    render(localGameState);
    if (!localGameState.gameOver)
      gameLoop = requestAnimationFrame(gameLoopFn);
  }

  function startGame() {
    if (!gameLoop) gameLoop = requestAnimationFrame(gameLoopFn);
  }

  document.addEventListener('keydown', e => { 
    const k = e.key;
    const c = e.code;
    if (k in keyState) 
      keyState[k] = true;
    if (c in keyState) 
      keyState[c] = true; 
    if (e.key === 'Enter') 
      localGameState.gameStarted = true; 
  });
 
  document.addEventListener('keyup', e => { 
    const k = e.key;
    const c = e.code;
    if (k in keyState) 
      keyState[k] = false;
    if (c in keyState) 
      keyState[c] = false;
  });
  canvas.onclick = () => localGameState.gameStarted = true;

  render(localGameState);
  startGame();  

  function render(state:any) {
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
    drawCenterLine(ctx, canvasWidth, canvasHeight);
    if (mode !== "training") {
      drawScore(ctx, state.score, canvasWidth);
      if (totalGames > 0)
        drawMatchBalls(ctx, state.totalScore, totalGames, canvasWidth);
    }
    drawBall(ctx, state.ball);
    drawPaddles(ctx, state.players);
    if (!state.gameStarted) drawStartMessage(ctx, canvasWidth, canvasHeight);
    if ((state.totalScore.left == totalGames || state.totalScore.right == totalGames) && mode != "training")
      drawWinner(ctx, canvasWidth, canvasHeight, state.totalScore);
  }

  function drawStartMessage(ctx:CanvasRenderingContext2D, w:number, h:number) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; 
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'white'; 
    ctx.font = '32px sans-serif'; 
    ctx.textAlign = 'center'; 
    ctx.fillText('Press ENTER or Click to Start', w / 2, h / 2);
    if (totalPlayers == 2)
      ctx.fillText('Player 1: W/S keys | Player 2: Arrow keys', w / 2, h / 2 + 50); 
    else if (totalPlayers == 4)
      ctx.fillText('Left Paddle 1: W / L | Right Paddle: Arrow Up / Numpad 5', w / 2, h / 2 + 50); 
    else
      ctx.fillText('Player 1: Arrow Up/Down keys', w / 2, h / 2 + 50); 
  }

  function drawBall(ctx:CanvasRenderingContext2D, b:any) {
    ctx.beginPath(); 
    ctx.arc(b.x, b.y, b.width || 15, 0, 2 * Math.PI); 
    ctx.fillStyle = 'white'; 
    ctx.fill(); 
    ctx.closePath();
  }

  function drawPaddles( ctx: CanvasRenderingContext2D, players: LocalPlayer[]) {
    ctx.fillStyle = 'white';
    for (const p of players) {
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }
  }

  function drawScore(ctx:CanvasRenderingContext2D, score: Record<'left'|'right', number>, w:number) {
    ctx.font = '100px sans-serif'; 
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right'; 
    ctx.fillText(String(score.left), w / 2 - 50, 100);
    ctx.textAlign = 'left';  
    ctx.fillText(String(score.right), w / 2 + 50, 100);
  }

  function drawCenterLine(ctx:CanvasRenderingContext2D, w:number, h:number) {
    ctx.strokeStyle = 'white'; 
    ctx.lineWidth = 3; 
    ctx.setLineDash([10,10]);
    ctx.beginPath(); 
    ctx.moveTo(w / 2,0); 
    ctx.lineTo(w / 2,h); 
    ctx.stroke(); 
    ctx.setLineDash([]);
  }

  function drawMatchBalls(
    ctx: CanvasRenderingContext2D,
    score: { left:number, right:number },
    total: number,
    canvasWidth: number
  ) {
    const radius=10, spacing=30, yPos=140;
    const drawRow=(wins:number, x:number)=>{
      for(let i = 0; i < total; i++) {
        const cx = x + i * spacing;
        ctx.beginPath();
        ctx.arc(cx, yPos, radius, 0, 2 * Math.PI);

        if (i < wins) { 
          ctx.fillStyle = 'white';
          ctx.fill();
        } else { 
          ctx.strokeStyle = 'gray';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.closePath();}
    };
    
    drawRow(score.left, canvasWidth / 2 - 50 - spacing * (total - 1) - radius);
    drawRow(score.right, canvasWidth / 2 + 50 + radius);
  }

  function drawWinner(
    ctx:CanvasRenderingContext2D, 
    w:number, 
    h:number, 
    score: { left:number, right:number }
  ) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; 
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'white'; 
    ctx.font = '80px sans-serif'; 
    ctx.textAlign = 'center'; 
    let winner;
    if (score.left >= totalGames)
      winner = "Left paddle wins!";
    else
      winner = "Right paddle wins!";
    ctx.fillText(winner, w / 2, h / 2);
  }

  function togglePause() {
    if (localGameState.gameOver) return;
    if (!localGameState.isPaused) {
      localGameState.isPaused = true;
      pauseAt = performance.now();
      cancelAnimationFrame(gameLoop!);
      sendStatus(gameId, {
        status: 'paused',
        gameId: gameId,
        matchId: currMatchId,
      }).catch(console.error);
    } else {
      statsTracker.shiftTimes(performance.now() - pauseAt);
      localGameState.isPaused = false;
      gameLoop = requestAnimationFrame(gameLoopFn);
      sendStatus(gameId, {
        status: 'active',
        gameId: gameId,
        matchId: currMatchId,
      }).catch(console.error);
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') togglePause();
  });
  document.addEventListener('click', e => {
    if (!canvas.contains(e.target as Node)) togglePause();
  });
}

