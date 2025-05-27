import type { RouteParams } from "../router";

export function renderGamePage(params: RouteParams): void {
  const gameId = params.gameId;
  console.log("Params:", params);

  if (!gameId) {
    document.body.innerHTML = `<h1 style="color:white;font-family:sans-serif">Missing gameId in URL!</h1>`;
    return;
  }

  let gameState: any = null;

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
  });

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${protocol}://${window.location.host}/sessions/${gameId}`);  

  socket.onopen = () => {
    console.log(`✅ Connected to game session: ${gameId}`);
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'GAME_INITIALIZED') {
        gameState = message.state;
        console.log('Game initialized with state:', gameState);
        render(gameState);
        setupInputHandlers();
      }

      if (message.type === 'STATE') {
        gameState = message.s; 
        render(gameState);
      }
    } catch (err) {
      console.error("❌ Failed to parse state:", err);
    }
  };

  socket.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
  };

  function render(state: any) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawCenterLine();

    if (state.ball) drawBall(state.ball);
    if (state.players) drawPaddles(state.players);
    if (state.score) drawScore(state.score);
    
    if (!state.gameStarted) {
      drawStartMessage();
    }
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

  function sendPlayerInput(input: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'PLAYER_INPUT',
        input
      }));
    }
  }

  function sendDimensions() {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'DIMENSIONS',
          width:  canvasWidth,
          height: canvasHeight,
          dpr:    window.devicePixelRatio
        })
      );
    }
  }

  function setupInputHandlers() {
    const keys = {
      w: false,
      s: false,
      ArrowUp: false,
      ArrowDown: false
    };

    let lastInputSent = 0;
    const INPUT_THROTTLE = 16;

    function sendThrottledInput(input: any) {
      const now = Date.now();
      if (now - lastInputSent >= INPUT_THROTTLE) {
        lastInputSent = now;
        sendPlayerInput(input);
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key in keys && !keys[e.key as keyof typeof keys]) {
        keys[e.key as keyof typeof keys] = true;
        sendThrottledInput({ keys });
      }
      
      if (e.key === 'Enter' && gameState && !gameState.gameStarted) {
        sendPlayerInput({ action: 'START_GAME' });
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key in keys && keys[e.key as keyof typeof keys]) {
        keys[e.key as keyof typeof keys] = false;
        sendThrottledInput({ keys });
      }
    });

    canvas.onclick = () => {
      if (gameState && !gameState.gameStarted) {
        sendPlayerInput({ action: 'START_GAME' });
      }
    };
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

  socket.addEventListener('open', sendDimensions);
  window.addEventListener('resize', () => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    sendDimensions();
  })
}

