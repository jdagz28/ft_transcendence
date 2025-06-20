'use strict'

const fp = require('fastify-plugin')


module.exports = fp(async function (fastify, opts) {
  fastify.decorate('createInitialGameState', function (canvasWidth, canvasHeight) {
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
      gameStarted: false
    };
  });

  fastify.decorate('handlePlayerInput', function (session, message, socket) {
    const playerId = session.sockets.size <= 1 ? 'p1' : 'p2'; 
    const { input } = message;
    const state = session.state;

    if (!state.gameStarted && input.action === 'START_GAME') {
      state.gameStarted = true;
      const startMessage = {
        type: 'GAME_STARTED',
        state: {
          gameStarted: true,
          ball: state.ball,
          players: state.players,
          score: state.score
        }
      };
      
      const msg = JSON.stringify(startMessage);
      for (const socket of session.sockets) {
        if (socket.readyState === 1) {
          socket.send(msg);
        }
      }
      
      if (!session.tickHandle) {
        fastify.startGameLoop(session);
      }
    }
  
    if (input.keys) {
      fastify.updatePaddlePosition(state, playerId, input.keys);
    }
  });

  fastify.decorate('startGameLoop', function (session) {
    const TICK_RATE = 60;
    const BROADCAST_RATE = 60;
    let tickCount = 0;

    if (session.tickHandle) {
      console.log('⚠️ Game loop already exists');
      return;
    }
    
    console.log('🎯 Creating game loop interval');
    session.startedAt = Date.now();
    session.lastBroadcast = 0;

    session.tickHandle = setInterval(() => {
      if (!session.state.gameStarted) {
        console.log('⏸️ Game not started, skipping tick');
        return;
      }

      fastify.stepPhysics(session.state);
      tickCount++;
      
      if (tickCount % Math.floor(TICK_RATE / BROADCAST_RATE) === 0) {
        fastify.broadcastState(session);
      }
      
      if (tickCount % 60 === 0) {
        console.log(`🎮 Game tick ${tickCount}, ball at (${session.state.ball.x}, ${session.state.ball.y})`);
      }
    }, 1000 / TICK_RATE); 
    
    console.log('✅ Game loop started with handle:', session.tickHandle);
  });


  fastify.decorate('broadcastState', function (session) {
    if (!session.state) {
      console.warn('⚠️ No session state to broadcast');
      return;
    }
    const { ball, players, score, gameStarted } = session.state;

    if (!ball || !players || !score) {
      console.warn('⚠️ Invalid state structure:', { ball: !!ball, players: !!players, score: !!score });
      return;
    }

    const payload = {
      type: 'GAME_STATE',
      t: Date.now(),
      lastSeq: session.lastProcessedSeq || 0,
      s: {
        ball: {
          x: ball.x,
          y: ball.y,
          width: ball.width
        },
        players: {
          p1: {
            x: players.p1.x,
            y: players.p1.y,
            width: players.p1.width,
            height: players.p1.height
          },
          p2: {
            x: players.p2.x,
            y: players.p2.y,
            width: players.p2.width,
            height: players.p2.height
          }
        },
        score,
        gameStarted 
      }
    };
  
    const msg = JSON.stringify(payload);
    for (const socket of session.sockets) {
      if (socket.readyState === 1) {
        socket.send(msg);
      }
    }
  });

  fastify.decorate('stepPhysics', function (state) {
    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= 0 || ball.y >= state.canvasHeight) {
      ball.vy *= -1; 
    }

    const p1 = state.players.p1;
    const p2 = state.players.p2;

    if (ball.x <= p1.x + p1.width && 
        ball.y >= p1.y && 
        ball.y <= p1.y + p1.height) {
      ball.vx *= -1; 
      ball.x = p1.x + p1.width;
    } else if (ball.x >= p2.x && 
               ball.y >= p2.y && 
               ball.y <= p2.y + p2.height) {
      ball.vx *= -1; 
      ball.x = p2.x - ball.width;
    }

    if (ball.x < 0) {
      state.score.p2++;
      fastify.resetBall(ball, state);
    } else if (ball.x > state.canvasWidth) {
      state.score.p1++;
      fastify.resetBall(ball, state);
    }
  });

  fastify.decorate('resetBall', function (ball, state) {
    ball.x = state.canvasWidth / 2;
    ball.y = state.canvasHeight / 2;
    ball.vx = Math.random() < 0.5 ? 4 : -4; 
    ball.vy = Math.random() < 0.5 ? 3 : -3; 
  });

  fastify.decorate('updatePaddlePosition', function (state, playerId, keys) {
    const paddleSpeed = 8;
    const paddleHeight = state.players.p1.height;
    
    if (playerId === 'p1') {
      const player = state.players.p1;
      if (keys.w && player.y > 0) {
        player.y -= paddleSpeed;
      }
      if (keys.s && player.y < state.canvasHeight - paddleHeight) {
        player.y += paddleSpeed;
      }
    }
    
    if (playerId === 'p2') {
      const player = state.players.p2;
      if (keys.ArrowUp && player.y > 0) {
        player.y -= paddleSpeed;
      }
      if (keys.ArrowDown && player.y < state.canvasHeight - paddleHeight) {
        player.y += paddleSpeed;
      }
    }
  });

}, {
  name: 'game-plugin'
});


