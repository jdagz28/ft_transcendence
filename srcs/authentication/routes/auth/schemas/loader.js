'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./register.json'))
  fastify.addSchema(require('./login.json'))
  fastify.addSchema(require('./token.json'))
  fastify.addSchema(require('./token-header.json'))
  fastify.addSchema(require('./user.json'))
  fastify.addSchema(require('./getUser.json'))
  fastify.addSchema(require('./verify.json'))
  fastify.addSchema(require('./verify-response.json'))
  fastify.addSchema(require('./changePassword.json'))
  fastify.addSchema(require('./mfaVerify.json'))
  fastify.addSchema(require('./mfaRequired.json'))
  fastify.addSchema(require('./mfaType.json'))
})
