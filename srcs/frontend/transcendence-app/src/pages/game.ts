import type { RouteParams } from "../router";

export function renderGamePage(params: RouteParams): void {
  const gameId = params.gameId;
  // const mode = params.mode || 'local-multiplayer'; //! DELETE for testing
  const mode = params.mode || 'online'; 
  
  console.log("Params:", params);

  if (!gameId) {
    document.body.innerHTML = `<h1 style="color:white;font-family:sans-serif">Missing gameId in URL!</h1>`;
    return;
  }

  let gameState: any = null;
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

  function setupOnlineGame() {
    let predictedState: any = null;
    let inputSequence = 0;
    let pendingInputs: Array<{seq: number, input: any, timestamp: number}> = [];
    let lastServerUpdate = 0;
    let isConnected = false;
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/sessions/${gameId}`);
    
    socket.onopen = () => {
      console.log(`✅ Connected to game session: ${gameId}`);
      isConnected = true; 
      sendDimensions();

      setInterval(() => {
        if (lastServerUpdate > 0 && Date.now() - lastServerUpdate > 5000) {
          console.warn('⚠️ No server updates for 5 seconds - connection may be unstable');
        }
      }, 2000);
    };

    socket.onmessage = (event) => {
      try {
        if (!event.data || typeof event.data !== 'string') {
          console.warn("⚠️ Received invalid WebSocket data");
          return;
        }

        const message = JSON.parse(event.data);
        if (message.type === 'GAME_INITIALIZED') {
          gameState = message.state;
          predictedState = JSON.parse(JSON.stringify(gameState));
          console.log('Game initialized with state:', gameState);
          render(predictedState);
          setupPredictiveInputHandlers();
        }

        if (message.type === 'GAME_STARTED') {
        if (predictedState) {
          predictedState.gameStarted = true;
        }
        if (gameState) {
          gameState.gameStarted = true;
        }
        render(predictedState || gameState);
      }

        if (message.type === 'GAME_STATE') {
          lastServerUpdate = Date.now();
          if (message.s !== null && message.s !== undefined) {
            reconcileWithServer(message.s, message.t || Date.now());
          } else {
            console.warn("⚠️ Received GAME_STATE without state data");
          }
        }
      } catch (err) {
        console.error("❌ Failed to parse state:", err);
        console.error("❌ Raw message data:", event.data);
      }
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };

    function reconcileWithServer(serverState: any, serverTimestamp: number) {
      if (!serverState) {
        console.warn("⚠️ Received null serverState - skipping reconciliation");
        return;
      }
      if (!predictedState && gameState) {
        predictedState = JSON.parse(JSON.stringify(gameState));
      }
      
      if (!predictedState) {
        console.warn("No predicted state available for reconcilation");
        return;
      }
      
      if (serverState.gameStarted !== undefined) {
        predictedState.gameStarted = serverState.gameStarted;
        gameState.gameStarted = serverState.gameStarted;
        console.log('🎮 Updated gameStarted to:', serverState.gameStarted);
      }

      const networkDelay = Date.now() - serverTimestamp;
      if (networkDelay > 100) {
        console.log(`🐌 High latency detected: ${networkDelay}ms`);
      }

      if (serverState.ball) {
        predictedState.ball = { ...predictedState.ball, ...serverState.ball };
      }
      if (serverState.score) {
        predictedState.score = serverState.score;
      }
      
      if (serverState.players) {
        Object.keys(serverState.players).forEach(playerId => {
          if (predictedState.players[playerId]) {
            // For player 1, only update if there's a significant difference (client prediction)
            if (playerId === 'p1') {
              const serverPlayerPos = serverState.players[playerId].y;
              const predictedPlayerPos = predictedState.players[playerId].y;
              
              if (serverPlayerPos !== undefined && predictedPlayerPos !== undefined && 
                  Math.abs(serverPlayerPos - predictedPlayerPos) > 5) {
                console.log('🔄 Reconciling position difference:', Math.abs(serverPlayerPos - predictedPlayerPos));
                smoothCorrectPosition(serverPlayerPos, predictedPlayerPos);
              }
            } else {
              // For other players, always update with server data
              predictedState.players[playerId] = { 
                ...predictedState.players[playerId], 
                ...serverState.players[playerId] 
              };
            }
          }
        });
      }

      if (serverState.lastSeq) {
        pendingInputs = pendingInputs.filter(input => input.seq > serverState.lastSeq);
      }
      
      render(predictedState);
    }

    function smoothCorrectPosition(serverY: number, predictedY: number) {
      if (!predictedState) return;
      
      const player = predictedState.players.p1;
      const diff = serverY - predictedY;
      
      player.y = predictedY + (diff * 0.5);
      
      const remainingDiff = diff * 0.5;
      const correctionSteps = 5;
      const stepSize = remainingDiff / correctionSteps;
      
      let step = 0;
      const correctInterval = setInterval(() => {
        if (step >= correctionSteps || !predictedState) {
          clearInterval(correctInterval);
          return;
        }
        
        predictedState.players.p1.y += stepSize;
        step++;
        render(predictedState);
      }, 16);
    }


    function sendPlayerInput(input: any) {
      if (!isConnected || socket.readyState !== WebSocket.OPEN) {
        console.warn("⚠️ Cannot send input - WebSocket not ready");
        return;
      }
      
      socket.send(JSON.stringify({
        type: 'PLAYER_INPUT',
        input
      }));
    }

    let dimensionTimeout: number | null = null;
    function sendDimensions() {
      if (dimensionTimeout !== null) {
        clearTimeout(dimensionTimeout);
      }
      dimensionTimeout = setTimeout(() => {
        if (isConnected && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'DIMENSIONS',
            width: canvas.width,
            height: canvas.height,
            dpr: window.devicePixelRatio
          }));
        }
      }, 200); 
    }

    function applyInputLocally(input: any, sequence: number) {
      if (!predictedState) return;
      
      pendingInputs.push({
        seq: sequence,
        input: input,
        timestamp: Date.now()
      });
      
      if (input.keys && predictedState.gameStarted) {
        const paddleSpeed = 8;
        const player = predictedState.players.p1;
        
        if (input.keys.w && player.y > 0) {
          player.y = Math.max(0, player.y - paddleSpeed);
        }
        if (input.keys.s && player.y < predictedState.canvasHeight - player.height) {
          player.y = Math.min(predictedState.canvasHeight - player.height, player.y + paddleSpeed);
        }
      }
      
      render(predictedState);
    }

    function setupPredictiveInputHandlers() {
      const keys = {
        w: false,
        s: false,
        ArrowUp: false,
        ArrowDown: false
      };

      let inputInterval: number | null = null;

      function sendContinuousInput() {
        if (!isConnected || socket.readyState !== WebSocket.OPEN) return;
        
        const hasActiveInput = keys.w || keys.s || keys.ArrowUp || keys.ArrowDown;
        
        if (hasActiveInput) {
          inputSequence++;
          const input = {
            keys: {...keys},
            seq: inputSequence,
            timestamp: Date.now()
          };
          
          applyInputLocally(input, inputSequence);
          sendPlayerInput(input);
        }
      }

      function startInputLoop() {
        if (!inputInterval) {
          inputInterval = setInterval(sendContinuousInput, 16); // 60fps
        }
      }

      function stopInputLoop() {
        if (inputInterval) {
          clearInterval(inputInterval);
          inputInterval = null;
        }
      }

      document.addEventListener('keydown', (e) => {
        if (e.key in keys && !keys[e.key as keyof typeof keys]) {
          keys[e.key as keyof typeof keys] = true;
          startInputLoop();
        }
        
        if (e.key === 'Enter' && predictedState && !predictedState.gameStarted) {
          sendPlayerInput({ action: 'START_GAME' });
        }
      });

      document.addEventListener('keyup', (e) => {
        if (e.key in keys && keys[e.key as keyof typeof keys]) {
          keys[e.key as keyof typeof keys] = false;
          
          const hasActiveInput = Object.values(keys).some(pressed => pressed);
          if (!hasActiveInput) {
            stopInputLoop();
            sendContinuousInput();
          }
        }
      });

      canvas.onclick = () => {
        console.log('🖱️ Canvas clicked, gameState:', gameState?.gameStarted);
        if (gameState && !gameState.gameStarted) {
          console.log('📤 Sending START_GAME action');
          sendPlayerInput({ action: 'START_GAME' });
        }
      };
    }

    window.addEventListener('resize', () => {
      canvasWidth = window.innerWidth;
      canvasHeight = window.innerHeight;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      sendDimensions();
    });
  }

  if (isLocalMode(mode)) {
    localGameState = createLocalGameState();
    render(localGameState);
    setupLocalInputHandlers();
    startLocalGameLoop();
  } else {
    setupOnlineGame();
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