const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function gameAutoHooks (fastify, opts) {
  const dbApi = axios.create({
    baseURL: `http://database:${process.env.DB_PORT}`,
    timeout: 2_000
  });

  function bearer (request) {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw fastify.httpErrors.unauthorized('Missing JWT')
    }
    return token;
  }

  function internalHeaders (request) {
    return {
      'x-internal-key': process.env.INTERNAL_KEY,
      Authorization: `Bearer ${bearer(request)}`
    }
  }
  
  fastify.register(schemas)

  fastify.decorate('notificationsService', {
    async getUserNotifications (request, userId) {
      const response = await dbApi.get(`/notifications/${userId}`, {
        headers: internalHeaders(request)
      })
      return response.data.notifications || []
    },

    async updateNotificationStatus (request, userId, notificationId, status) {
      const response = await dbApi.put(`/notifications/${userId}/${notificationId}`, {
        status
      }, {
        headers: internalHeaders(request)
      })
      return response.data
    }
  })
}, {
  name: 'notificationsAutoHooks',
})