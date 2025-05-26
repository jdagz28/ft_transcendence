'use strict'

const websocketPlugin = require('@fastify/websocket')


module.exports = async function (fastify, opts) {
  fastify.register(websocketPlugin)

  fastify.route({
    method: 'GET',
    url: '/sessions/:gameId',
    handler: (request, reply) => {
      console.log('Request Headers:', request.headers) //! DELETE
      console.log('Request Params:', request.params) //! DELETE
      reply.status(426).send({ error: 'Expected WebSocket Upgrade' });
    },
    wsHandler: (connection, request) => {
      const { gameId } = request.params
      console.log(`WebSocket connection established for gameId: ${gameId}`) //! DELETE

      const session = fastify.getSession(gameId)
      session.sockets.add(connection.socket)
      console.log(`Current sockets in session: ${session.sockets.size}`) //! DELETE

      connection.socket.on('message', message => {
        for (const socket of session.sockets) {
          if (socket !== connection.socket) {
            socket.send(message.toString())
          }
        }
      })

      connection.socket.on('close', () => {
        fastify.removeSocket(gameId, connection.socket)
      })
    }
  })
}