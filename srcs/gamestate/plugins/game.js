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
        vx: 4, 
        vy: 3, 
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
    const playerId = session.sockets.size <= 1 ? 'p1' : 'p2'; // First player = p1, second = p2
    const { input } = message;
    const state = session.state;
    if (!state.gameStarted && input.action === 'START_GAME') {
      state.gameStarted = true;
      if (!session.tickHandle) {
        startGameLoop(session);
      }
    }
    if (input.keys) {
      updatePaddlePosition(state, playerId, input.keys);
    }
  });

  fastify.decorate('startGameLoop', function (session) {
    if (session.tickHandle) return; // already running
    session.startedAt = Date.now();

    session.tickHandle = setInterval(() => {
      if (session.state.gameStarted) {
        stepPhysics(session.state);
        
        const msg = JSON.stringify({
          type: 'STATE',
          t: Date.now(),
          s: session.state
        });

        for (const socket of session.sockets) {
          if (socket.readyState === 1) { 
            socket.send(msg);
          }
        }
      }
    }, 1000 / 60); 
  });

  fastify.decorate('stepPhysics', function (state) {
    const ball = state.ball;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Ball collision with top and bottom walls
    if (ball.y <= 0 || ball.y >= state.canvasHeight) {
      ball.vy *= -1; // Reverse vertical direction
    }

    // Ball collision with paddles
    const p1 = state.players.p1;
    const p2 = state.players.p2;

    if (ball.x <= p1.x + p1.width && 
        ball.y >= p1.y && 
        ball.y <= p1.y + p1.height) {
      ball.vx *= -1; // Reverse horizontal direction
      ball.x = p1.x + p1.width; // Prevent sticking
    } else if (ball.x >= p2.x && 
               ball.y >= p2.y && 
               ball.y <= p2.y + p2.height) {
      ball.vx *= -1; // Reverse horizontal direction
      ball.x = p2.x - ball.width; // Prevent sticking
    }

    // Scoring logic
    if (ball.x < 0) {
      state.score.p2++;
      resetBall(ball, state);
    } else if (ball.x > state.canvasWidth) {
      state.score.p1++;
      resetBall(ball, state);
    }
  });

  fastify.decorate('resetBall', function (ball, state) {
    ball.x = state.canvasWidth / 2;
    ball.y = state.canvasHeight / 2;
    ball.vx = Math.random() < 0.5 ? 4 : -4; // Randomize initial direction
    ball.vy = Math.random() < 0.5 ? 3 : -3; // Randomize initial direction
  });

  fastify.decorate('updatePaddlePosition', function (state, playerId, keys) {
    const paddleSpeed = 10;
    const paddleHeight = state.players.p1.height;
    
    let player = null;
    if (playerId.includes('p1') || keys.w || keys.s) {
      player = state.players.p1;
    } else if (playerId.includes('p2') || keys.ArrowUp || keys.ArrowDown) {
      player = state.players.p2;
    }
    
    if (!player) return;
    
    if (keys.w && player.y > 0) {
      player.y -= paddleSpeed;
    }
    if (keys.s && player.y < state.canvasHeight - paddleHeight) {
      player.y += paddleSpeed;
    }
    
    if (keys.ArrowUp && player.y > 0) {
      player.y -= paddleSpeed;
    }
    if (keys.ArrowDown && player.y < state.canvasHeight - paddleHeight) {
      player.y += paddleSpeed;
    }
  });

}, {
  name: 'game-plugin'
});


