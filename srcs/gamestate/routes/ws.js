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
    (connection, request, params) => {
    // console.log('Request received for WebSocket connection', request);
    console.log('Params:', params);

    const { gameId } = params;  
    console.log(`✅ WebSocket connection for gameId: ${gameId}`); //! DELETE

    const session =  fastify.getSession(gameId);
    session.sockets.add(connection.socket);

    connection.socket.on('message', (msg) => {
      for (const sock of session.sockets) {
        if (sock !== connection.socket) {
          sock.send(msg.toString());
        }
      }docker 
    });

    connection.socket.on('close', () => {
      fastify.removeSocket(gameId, connection.socket);
    });
  });
};
