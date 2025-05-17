'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function chatPlugin (fastify, opts) {
  await fastify.register(require('@fastify/websocket'))

  fastify.get('/chat', {websocket: true}, (socket, req) => {
    socket.on('message', message => {
      socket.send('hi from server')
    })
  })
})
