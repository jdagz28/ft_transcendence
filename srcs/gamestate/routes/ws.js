'use strict'

const websocketPlugin = require('@fastify/websocket')


module.exports = async function (fastify, opts) {
  fastify.register(websocketPlugin)

  fastify.get('/sessions/:gameId', { websocket: true }, (connection, req) => {
    const gameId = req.params.gameId

    const session = getSession(gameId)
    session.sockets.add(connection.socket)

    connection.socket.on('message', message => {
      for (const socket of session.sockets) {
        if (socket !== connection.socket) {
          socket.send(message.toString())
        }
      }
    })

    connection.socket.on('close', () => {
      removeSocket(gameId, connection.socket)
    })
  }, {
    name: 'websocket-sessions',
    dependencies: 'sessions'
  }  
)}