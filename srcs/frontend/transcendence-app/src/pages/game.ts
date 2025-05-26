import type { RouteParams } from "../router";

export function renderGamePage(params: RouteParams): void {
  const gameId = params.gameId;
  console.log("Params:", params);

  if (!gameId) {
    document.body.innerHTML = `<h1 style="color:white;font-family:sans-serif">Missing gameId in URL!</h1>`;
    return;
  }

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

  // ✅ Dynamic WebSocket based on gameId
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${protocol}://${window.location.host}/sessions/${gameId}`);  

  socket.onopen = () => {
    console.log(`✅ Connected to game session: ${gameId}`);
  };

  socket.onmessage = (event) => {
    try {
      const state = JSON.parse(event.data);
      if (state.type === 'STATE') {
        render(state);
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
    ctx.lineTo(canvasHeight / 2, canvasHeight);
    ctx.stroke();

    ctx.setLineDash([]);
  }
}
