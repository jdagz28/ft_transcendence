import type { RouteParams } from "../router";
// import type { GameDetails } from "../types/game";
import type { PlayerConfig } from "../types/game";
import { getConfig } from "../api/gameService";

interface GamePageElements {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  leftNames: HTMLElement;
  rightNames: HTMLElement;
}

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

  const config = await getConfig(gameId);
  const totalGames = config.settings.num_games;

  leftNames.innerHTML = "";
  rightNames.innerHTML = "";
  for (const p of config.players.filter((p: PlayerConfig) => p.paddle_side === "left")) { 
    const el = document.createElement("div");
    el.textContent = p.username;
    el.className = "bg-white/20 px-2 py-1 rounded";
    leftNames.appendChild(el);
  }
  for (const p of config.players.filter((p: PlayerConfig) => p.paddle_side === "right")) {  
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

  let localGameState: any = null;
  let gameLoop: number | null = null;
  const keys = { 
    w:false,
    s:false, 
    ArrowUp:false, 
    ArrowDown:false 
  };

  function isLocalMode(mode: string): boolean {
    return mode === "local-multiplayer" || mode === "single-player";
  }

  function createLocalGameState() {
    const paddleHeight = 200, paddleWidth = 25;
    return {
      ball: { 
        x: canvasWidth / 2, 
        y: canvasHeight / 2, 
        vx: 5, 
        vy: 4, 
        width: 15 
      },
      players: {
        p1: { 
          x: 50, 
          y: canvasHeight / 2 - paddleHeight / 2, 
          width: paddleWidth, 
          height: paddleHeight 
        },
        p2: { 
          x: canvasWidth - 50 - paddleWidth, 
          y: canvasHeight / 2 - paddleHeight / 2, 
          width: paddleWidth, 
          height: paddleHeight 
        }
      },
      score: { p1: 0, p2: 0 },
      canvasWidth, 
      canvasHeight,
      settings: config.settings,
      gameStarted: false
    };
  }

  function stepLocalPhysics(state: any) {
    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= ball.width || ball.y >= state.canvasHeight - ball.width) {
      ball.vy *= -1;
      ball.y = Math.max(ball.width, Math.min(state.canvasHeight - ball.width, ball.y));
    }

    const p1 = state.players.p1;
    const p2 = state.players.p2;

    if (ball.x - ball.width <= p1.x + p1.width && 
        ball.y >= p1.y && 
        ball.y <= p1.y + p1.height &&
        ball.vx < 0) {
      ball.vx *= -1;
      ball.x = p1.x + p1.width + ball.width;
    }

    if (ball.x + ball.width >= p2.x && 
        ball.y >= p2.y && 
        ball.y <= p2.y + p2.height &&
        ball.vx > 0) {
      ball.vx *= -1;
      ball.x = p2.x - ball.width;
    }

    if (ball.x < 0) {
      state.score.p2++;
      resetBall(ball, state);
    } else if (ball.x > state.canvasWidth) {
      state.score.p1++;
      resetBall(ball, state);
    }  
  }
  function resetBall(ball: any, state: any) {
    ball.x = state.canvasWidth / 2;
    ball.y = state.canvasHeight / 2;
    ball.vx = Math.random() < 0.5 ? 5 : -5;
    ball.vy = Math.random() < 0.5 ? 4 : -4;
  }

  function updatePaddles(state:any) {
    const paddleSpeed = 8;
    const p1 = state.players.p1;
    const p2 = state.players.p2;
    
    if (keys.w && p1.y > 0) {
      p1.y = Math.max(0, p1.y - paddleSpeed);
    }
    if (keys.s && p1.y < state.canvasHeight - p1.height) {
      p1.y = Math.min(state.canvasHeight - p1.height, p1.y + paddleSpeed);
    }

    if (keys.ArrowUp && p2.y > 0) {
      p2.y = Math.max(0, p2.y - paddleSpeed);
    }
    if (keys.ArrowDown && p2.y < state.canvasHeight - p2.height) {
      p2.y = Math.min(state.canvasHeight - p2.height, p2.y + paddleSpeed);
    }
  }

  function gameLoopFn() {
    if (localGameState.gameStarted) {
      stepLocalPhysics(localGameState);
      updatePaddles(localGameState);
    }
    render(localGameState);
    gameLoop = requestAnimationFrame(gameLoopFn);
  }

  function startGame() {
    if (!gameLoop) gameLoop = requestAnimationFrame(gameLoopFn);
  }

  document.addEventListener('keydown', e => { if(e.key in keys) keys[e.key as keyof typeof keys]=true; if(e.key==='Enter') localGameState.gameStarted=true; });
  document.addEventListener('keyup',   e => { if(e.key in keys) keys[e.key as keyof typeof keys]=false; });
  canvas.onclick = () => localGameState.gameStarted = true;

  if (isLocalMode(config.settings.mode)) {
    localGameState = createLocalGameState();
    render(localGameState);
    startGame();
  }

  function render(state:any) {
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
    drawCenterLine(ctx, canvasWidth, canvasHeight);
    drawScore(ctx, state.score, canvasWidth);
    drawMatchBalls(ctx, state.score, totalGames, canvasWidth);
    drawBall(ctx, state.ball);
    drawPaddles(ctx, state.players);
    if (!state.gameStarted) drawStartMessage(ctx, canvasWidth, canvasHeight);
  }

  function drawStartMessage(ctx:CanvasRenderingContext2D, w:number, h:number) {
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='white'; ctx.font='32px sans-serif'; ctx.textAlign='center'; ctx.fillText('Press ENTER or Click to Start', w/2, h/2);
  }

  function drawBall(ctx:CanvasRenderingContext2D, b:any) {
    ctx.beginPath(); ctx.arc(b.x,b.y,b.width||15,0,2*Math.PI); ctx.fillStyle='white'; ctx.fill(); ctx.closePath();
  }

  function drawPaddles(ctx:CanvasRenderingContext2D, players: Record<string,{x:number,y:number,width:number,height:number}>) {
    for (const p of Object.values(players)) {
      ctx.fillStyle='white';
      ctx.fillRect(p.x,p.y,p.width,p.height);
    }
  }

  function drawScore(ctx:CanvasRenderingContext2D, score:{p1:number,p2:number}, w:number) {
    ctx.font='100px sans-serif'; ctx.fillStyle='white';
    ctx.textAlign='right'; ctx.fillText(String(score.p1), w/2 - 50, 100);
    ctx.textAlign='left';  ctx.fillText(String(score.p2), w/2 + 50, 100);
  }

  function drawCenterLine(ctx:CanvasRenderingContext2D, w:number, h:number) {
    ctx.strokeStyle='white'; ctx.lineWidth=3; ctx.setLineDash([10,10]);
    ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawMatchBalls(
  ctx: CanvasRenderingContext2D,
  score: { p1:number, p2:number },
  total: number,
  canvasWidth: number
) {
  const radius=10, spacing=30, yPos=140;
  const drawRow=(wins:number, x:number)=>{
    for(let i=0;i<total;i++){const cx=x+i*spacing;ctx.beginPath();ctx.arc(cx,yPos,radius,0,2*Math.PI);
      if(i<wins){ctx.fillStyle='white';ctx.fill();}else{ctx.strokeStyle='gray';ctx.lineWidth=2;ctx.stroke();}
      ctx.closePath();}
  };
  drawRow(score.p1, canvasWidth/2 - 50 - spacing*(total-1) - radius);
  drawRow(score.p2, canvasWidth/2 + 50 + radius);
}

