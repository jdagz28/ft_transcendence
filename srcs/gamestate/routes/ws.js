'use strict';

// const websocketPlugin = require('@fastify/websocket');

module.exports = async function (fastify, opts) {
  // fastify.register(websocketPlugin); 

  fastify.get('/sessions/:gameId', 
    { websocket: true,
      schema: {
        params: {
          type: 'object',
          properties: {
            gameId: { type: 'string' }
          },
          required: ['gameId']
        },
      }
     }, 
    (socket, request,) => {
    console.log('Params:', request.params); //! DELETE

    const { gameId } = request.params;  
    console.log(`✅ WebSocket connection for gameId: ${gameId}`); //! DELETE

    const session =  fastify.getSession(gameId);
    console.log('Session:', session); //! DELETE
    session.sockets.add(socket);

    socket.on('message', (msg) => {
      let message;
      try {
        message = JSON.parse(msg);
      } catch (error) {
        console.error('Error parsing message:', error);
        return;
      }

      if (message.type === 'DIMENSIONS') {
        console.log('Received dimensions:', {
          width: message.width,
          height: message.height,
          dpr: message.dpr
        });
      }

      if (!session.state) {
        session.state = fastify.createInitialGameState(message.width, message.height);
      }
      
      socket.send(JSON.stringify({
        type: 'GAME_INITIALIZED',
        state: session.state
      }));

      if (message.type === 'PLAYER_INPUT') {
        fastify.handlePlayerInput(session, message, socket);
      }
    });

    socket.on('close', () => {
      fastify.removeSocket(gameId, socket);
    });
  });
};
