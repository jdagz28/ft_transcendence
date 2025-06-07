import type { RouteParams } from "../router";

async function getConfig(gameId: number){
  const response = await fetch(`https://localhost:4242/games/${gameId}/details`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch game config for ${gameId}`);
  }
  return await response.json();
}

export function renderGamePage(params: RouteParams): void {
  const gameIdParam = params.gameId;
  const gameId = typeof gameIdParam === 'string' ? parseInt(gameIdParam, 10) : gameIdParam;
  const mode = params.mode || 'local-multiplayer';
  
  console.log("Params:", params);

  if (typeof gameId !== 'number' || isNaN(gameId)) {
    document.body.innerHTML = `<h1 style="color:white;font-family:sans-serif">Missing or invalid gameId in URL!</h1>`;
    return;
  }

  const configPromise = getConfig(gameId);
  console.log("configPromise", configPromise);

  let localGameState: any = null;
  let gameLoop: number | null = null;
  
  const currentKeys = {
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false
  };

  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.backgroundColor = 'black';

  window.addEventListener('resize', () => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    if (isLocalMode(mode) && localGameState) {
      localGameState.canvasWidth = canvasWidth;
      localGameState.canvasHeight = canvasHeight;
    }
  });

  function isLocalMode(mode: string): boolean {
    return mode === 'local-multiplayer' || mode === 'single-player';
  }

  function createLocalGameState(): any {
    const paddleHeight = 200;
    const paddleWidth = 25;
    
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
      gameStarted: false,
      mode: mode
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
      resetLocalBall(ball, state);
    } else if (ball.x > state.canvasWidth) {
      state.score.p1++;
      resetLocalBall(ball, state);
    }
  }

  function resetLocalBall(ball: any, state: any) {
    ball.x = state.canvasWidth / 2;
    ball.y = state.canvasHeight / 2;
    ball.vx = Math.random() < 0.5 ? 5 : -5;
    ball.vy = Math.random() < 0.5 ? 4 : -4;
  }

  function updateLocalPaddles(state: any, keys: any) {
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

  function startLocalGameLoop() {
    if (gameLoop) return;
    
    function loop() {
      if (localGameState && localGameState.gameStarted) {
        stepLocalPhysics(localGameState);
        updateLocalPaddles(localGameState, currentKeys);
      }
      
      if (localGameState) {
        render(localGameState);
      }
      
      gameLoop = requestAnimationFrame(loop);
    }
    
    gameLoop = requestAnimationFrame(loop);
  }

  function setupLocalInputHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key in currentKeys) {
        currentKeys[e.key as keyof typeof currentKeys] = true;
      }
      
      if (e.key === 'Enter' && localGameState && !localGameState.gameStarted) {
        localGameState.gameStarted = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key in currentKeys) {
        currentKeys[e.key as keyof typeof currentKeys] = false;
      }
    });

    canvas.onclick = () => {
      if (localGameState && !localGameState.gameStarted) {
        localGameState.gameStarted = true;
      }
    };
  }

  if (isLocalMode(mode)) {
    localGameState = createLocalGameState();
    render(localGameState);
    setupLocalInputHandlers();
    startLocalGameLoop();
  }

  function render(state: any) {
    try {

      if (!state) {
        console.warn("⚠️ Cannot render - no state provided");
        return;
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawCenterLine();
      
      if (state.ball) drawBall(state.ball);
      if (state.players) drawPaddles(state.players);
      if (state.score) drawScore(state.score);
      if (!state.gameStarted) {
        drawStartMessage();
      }
    } catch (err) {
      console.error("❌ Render error:", err);
      console.error("❌ Invalid state:", state);
    }
  }

  function drawStartMessage() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press ENTER or Click to Start', canvasWidth / 2, canvasHeight / 2);
    ctx.font = '16px sans-serif';
    
    ctx.fillText('Player 1: W/S keys | Player 2: Arrow keys', canvasWidth / 2, canvasHeight / 2 + 50);
  }

  function drawBall(ball: any) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.width || 15, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
  }

  function drawPaddles(players: Record<string, any>) {
    for (const player of Object.values(players)) {
      ctx.fillStyle = 'white';
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }
  }

  function drawScore(score: { p1: number; p2: number }) {
    ctx.font = '100px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.fillText(String(score.p1), canvasWidth / 2 - 50, 100);
    ctx.textAlign = 'left';
    ctx.fillText(String(score.p2), canvasWidth / 2 + 50, 100);
  }

  function drawCenterLine() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, 0);
    ctx.lineTo(canvasWidth / 2, canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}