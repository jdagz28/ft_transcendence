'use strict'

const fp = require('fastify-plugin')


module.exports = fp(async function (fastify, opts) {
  fastify.post('/notify/user/:userId', async (request, reply) => {
    const { userId } = request.params
    const notification = request.body
    
    if (!notification.timestamp) {
      notification.timestamp = Date.now()
    }
    
    console.log(`Sending notification to user ${userId}:`, notification)

    fastify.sendNotificationToUser(userId, notification)
    
    return { success: true, message: 'Notification sent to user' }
  })
  
  fastify.post('/notify/broadcast', async (request, reply) => {
    const notification = request.body
    
    if (!notification.timestamp) {
      notification.timestamp = Date.now()
    }
    
    fastify.broadcastNotification(notification)
    
    return { success: true, message: 'Notification broadcasted' }
  })

  fastify.get('/notifications/:userId', {
    schema: {
      params: fastify.getSchema('schemas:notifications:userId')
    },
    onRequest: fastify.authenticate,
    handler: async function notificationsHandler(request) {
      const { userId } = request.params
      
      const notifications = await fastify.notificationsService.getUserNotifications(request, userId)
      
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
      
      const updatedNotification = await fastify.notificationsService.updateNotificationStatus(request, userId, notificationId, status)
      
      return { userId, notificationId, updatedNotification }
    }
  })

}, {
  name: 'notificationsRoutes', 
})  
