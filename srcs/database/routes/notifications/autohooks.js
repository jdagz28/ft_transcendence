const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')

module.exports = fp(async function gameAutoHooks (fastify, opts) {

  fastify.register(schemas)

  fastify.decorate('dbNotifications', {
    async getUserNotifications ( userId) {
      const query = fastify.db.prepare('SELECT * FROM notifications WHERE user_id = ?')
      const notifications = query.all(userId)
      return notifications || []
    },

    async updateNotificationStatus ( userId, notificationId, status) {
      const response = await fastify.db.prepare('UPDATE notifications SET status = ? WHERE user_id = ? AND id = ?')
      response.run(status, userId, notificationId)
      return { userId, notificationId, status }
    }
  })
}, {
  name: 'notificationsAutoHooks',
})