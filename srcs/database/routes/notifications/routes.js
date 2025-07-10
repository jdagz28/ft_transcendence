'use strict'

const fp = require('fastify-plugin')


module.exports = fp(async function (fastify, opts) {
  fastify.get('/notifications/:userId', {
    schema: {
      params: fastify.getSchema('schemas:notifications:userId')
    },
    onRequest: fastify.authenticate,
    handler: async function notificationsHandler(request) {
      const { userId } = request.params

      const notifications = await fastify.dbNotifications.getUserNotifications(userId)

      return { userId, notifications }
    }
  })

  fastify.patch('/notifications/:userId/:notificationId', {
    schema: {
      params: fastify.getSchema('schemas:notifications:notificationId'),
      body: fastify.getSchema('schemas:notifications:updateNotificationStatus'),
    },
    onRequest: fastify.authenticate,
    handler: async function updateNotificationStatusHandler(request, reply) {
      const { userId, notificationId } = request.params
      const { status } = request.body

      const updatedNotification = await fastify.dbNotifications.updateNotificationStatus(userId, notificationId, status)

      return { userId, notificationId, updatedNotification }
    }
  })

}, {
  name: 'notificationsRoutes', 
})  
