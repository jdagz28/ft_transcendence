'use strict'

const fp = require('fastify-plugin')
const ws = require('@fastify/websocket')


module.exports = fp(async function (fastify, opts) {
  await fastify.register(ws)

  fastify.decorate('broadcastNotification', (notification) => {
    const message = JSON.stringify(notification)
    
    fastify.notificationClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message)
      }
    })
  })

  fastify.decorate('sendNotificationToUser', (userId, notification) => {
    const message = JSON.stringify(notification)
    console.log(`Sending notification to user ${userId}:`, notification) //!DELETE
    fastify.notificationClients.forEach(client => {
      if (client.readyState === 1 && client.userId === userId) {
        client.send(message)
      }
    })
  })

  fastify.decorate('notificationClients', new Set())

  fastify.route({
    method: 'GET',
    url: '/notifications/ws',
    handler: (req, reply) => {
      reply.code(426).send({ error: 'Upgrade Required' });
    },
    wsHandler: (socket, request) => {
      const userId = request.query.userId
      socket.userId = userId
      fastify.log.info(`WebSocket for notifications established`)
      if (!socket) {
        fastify.log.error('WebSocket does not have a socket property')
        return
      }
      if (!fastify.notificationClients)
        fastify.notificationClients = new Set()
      console.log(`Adding WebSocket client for user ${userId}`) //!DELETE
      fastify.notificationClients.add(socket)

      socket.on('close', () => {
        fastify.notificationClients.delete(socket)
      })
    }
  })
}), {
  name: 'notificationsPlugin'
}