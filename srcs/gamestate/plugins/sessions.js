'use strict'

const fp = require('fastify-plugin')


module.exports = fp(async function (fastify, opts) {
  fastify.decorate('sessions', new Map())

  fastify.decorate('getSession', function (gameId) {
    if (!fastify.sessions.has(gameId)) {
      fastify.sessions.set(
        gameId, 
        { 
          sockets: new Set(), 
          players: new Map() 
        }
      );
    }
    console.log(`🔍 Getting session for gameId: ${gameId}`) //!DELETE
    return fastify.sessions.get(gameId);
  });
  

  fastify.decorate('removeSocket', async function (gameId, socket) {
    const session = fastify.getSession(gameId)
    session.sockets.delete(socket)
  })
}, {
  name: 'sessions'
})