'use strict'

const fp = require('fastify-plugin')
const ws = require('@fastify/websocket')

module.exports = fp(async function wsBroadcast (fastify) {
  await fastify.register(ws)

  fastify.decorate('tournamentBroadcast', function (tournamentId, message) {
    const clients = fastify.tournamentClients?.[tournamentId];
    if (!clients)
      return;
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    }
  });
  fastify.decorate('tournamentClients', {})

  fastify.route({
    method: 'GET',
    url: '/tournaments/:tournamentId/ws',
    handler: (req, reply) => {
      reply.code(426).send({ error: 'Upgrade Required' });
    },
    wsHandler: (socket, request) => {
    const tournamentId = request.params?.tournamentId || request.raw?.params?.tournamentId;
    fastify.log.info(`WebSocket for tournament ${tournamentId} established`)
    if (!socket) {
      fastify.log.error('WebSocket does not have a socket property')
      return
    }

    socket.tournamentId = tournamentId
    if (!fastify.tournamentClients)
      fastify.tournamentClients = {}
    if (!fastify.tournamentClients[tournamentId])
      fastify.tournamentClients[tournamentId] = new Set()
    fastify.tournamentClients[tournamentId].add(socket)

    socket.on('close', () => {
      fastify.tournamentClients[tournamentId].delete(socket)
    })
  }})
}, {
  name: 'wsBroadcast'
})