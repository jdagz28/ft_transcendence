'use strict'

const path = require('node:path')
const AutoLoad = require('@fastify/autoload')

// Pass --options via CLI arguments in command to enable these options.
const options = {}

module.exports = async function (fastify, opts) {
  // Place here your custom code!

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


  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })
}

module.exports.options = options
