'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./notificationId.json'))
  fastify.addSchema(require('./userId.json'))
  fastify.addSchema(require('./updateNotificationStatus.json'))
})