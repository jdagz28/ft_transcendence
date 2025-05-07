'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./createUser.json'))
  fastify.addSchema(require('./user.json'))
  fastify.addSchema(require('./getUser.json'))
  fastify.addSchema(require('./userProfile.json'))
  fastify.addSchema(require('./getProfile.json'))
  fastify.addSchema(require('./avatar.json'))
  fastify.addSchema(require('./getAvatar.json'))
})
